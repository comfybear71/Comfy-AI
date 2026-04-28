import { NextRequest, NextResponse } from "next/server"
import { trimMessagesToFit } from "@/lib/tokens"
import {
  anthropicTools,
  openaiTools,
  executeGitHubTool,
  modelSupportsTools,
  NO_TOOLS_NOTICE,
} from "@/lib/github-tools"

type Message = { role: string; content: string; images?: string[] }
type Provider = "anthropic" | "xai" | "ollama" | "groq" | "ollama-cloud"

const GROQ_MODEL_IDS = new Set([
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
  "mixtral-8x7b-32768",
  "llama-3.1-70b-versatile",
])

function detectProvider(model: string): Provider {
  if (model.startsWith("claude-")) return "anthropic"
  if (model.startsWith("grok-")) return "xai"
  if (GROQ_MODEL_IDS.has(model)) return "groq"
  if (model.endsWith(":cloud") || model.endsWith("-cloud") || model.endsWith("-thinking")) return "ollama-cloud"
  return "ollama"
}

function detectImageMediaType(base64: string): string {
  const prefix = base64.slice(0, 12)
  if (prefix.startsWith("iVBORw")) return "image/png"
  if (prefix.startsWith("/9j/")) return "image/jpeg"
  if (prefix.startsWith("R0lGOD")) return "image/gif"
  if (prefix.startsWith("UklGR")) return "image/webp"
  return "image/png"
}

function toAnthropicMessages(messages: Message[]) {
  return messages
    .filter((m) => m.role !== "system")
    .map((m) => {
      const role = m.role === "assistant" ? "assistant" : "user"
      if (m.images && m.images.length > 0) {
        const content: any[] = m.images.map((img) => ({
          type: "image",
          source: { type: "base64", media_type: detectImageMediaType(img), data: img },
        }))
        if (m.content) content.push({ type: "text", text: m.content })
        return { role, content }
      }
      return { role, content: m.content }
    })
}

// Convert internal messages to OpenAI-compatible format (role + content only)
function toOpenAIMessages(messages: Message[]) {
  return messages.map((m) => ({ role: m.role, content: m.content }))
}

// ── Anthropic handler with tool loop ────────────────────────────────────────

function handleAnthropicWithTools(messages: Message[], model: string): Response {
  const apiKey = process.env.ANTHROPIC_API_KEY!
  const system = messages.find((m) => m.role === "system")?.content
  let anthropicMessages = toAnthropicMessages(messages)
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for (let i = 0; i < 6; i++) {
          const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model,
              max_tokens: 8192,
              stream: false,
              ...(system ? { system } : {}),
              messages: anthropicMessages,
              tools: anthropicTools,
            }),
          })

          if (!res.ok) {
            const errText = await res.text()
            controller.enqueue(encoder.encode(`**Error**: ${errText}`))
            break
          }

          const data = await res.json()
          const toolUseBlocks: any[] = data.content.filter((b: any) => b.type === "tool_use")
          const textBlock = data.content.find((b: any) => b.type === "text")

          if (textBlock?.text) controller.enqueue(encoder.encode(textBlock.text))

          if (toolUseBlocks.length === 0) break

          const toolResults: any[] = []
          for (const toolUse of toolUseBlocks) {
            const label = toolUse.name.replace(/_/g, " ")
            controller.enqueue(encoder.encode(`\n\n🔧 **${label}**: \`${JSON.stringify(toolUse.input).slice(0, 120)}\`\n`))
            const result = await executeGitHubTool(toolUse.name, toolUse.input)
            controller.enqueue(encoder.encode(`> ${result}\n`))
            toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: result })
          }

          anthropicMessages = [
            ...anthropicMessages,
            { role: "assistant", content: data.content },
            { role: "user", content: toolResults },
          ]
        }
      } catch (err: any) {
        controller.enqueue(encoder.encode(`\n\n**Error**: ${err.message}`))
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}

// ── OpenAI-compatible handler with tool loop (Groq, xAI, Ollama Cloud) ──────

type OpenAIEndpoint = {
  url: string
  apiKey: string
  label: string
}

function getOpenAIEndpoint(provider: Provider): OpenAIEndpoint {
  if (provider === "xai") {
    const apiKey = process.env.XAI_API_KEY
    if (!apiKey) throw new Error("XAI_API_KEY not configured")
    return { url: "https://api.x.ai/v1/chat/completions", apiKey, label: "xai" }
  }
  if (provider === "groq") {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) throw new Error("GROQ_API_KEY not configured")
    return { url: "https://api.groq.com/openai/v1/chat/completions", apiKey, label: "groq" }
  }
  if (provider === "ollama-cloud") {
    const apiKey = process.env.OLLAMA_CLOUD_API_KEY
    if (!apiKey) throw new Error("OLLAMA_CLOUD_API_KEY not configured")
    return { url: "https://ollama.com/v1/chat/completions", apiKey, label: "ollama-cloud" }
  }
  throw new Error(`No OpenAI endpoint for provider ${provider}`)
}

function handleOpenAIWithTools(messages: Message[], model: string, provider: Provider): Response {
  const endpoint = getOpenAIEndpoint(provider)
  const encoder = new TextEncoder()
  let convo = toOpenAIMessages(messages)

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for (let i = 0; i < 6; i++) {
          const res = await fetch(endpoint.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${endpoint.apiKey}`,
            },
            body: JSON.stringify({
              model,
              stream: false,
              messages: convo,
              tools: openaiTools,
              tool_choice: "auto",
            }),
          })

          if (!res.ok) {
            const errText = await res.text()
            controller.enqueue(encoder.encode(`**Error**: ${endpoint.label} ${errText}`))
            break
          }

          const data = await res.json()
          const choice = data.choices?.[0]
          const msg = choice?.message
          if (!msg) {
            controller.enqueue(encoder.encode(`**Error**: empty response from ${endpoint.label}`))
            break
          }

          if (msg.content) controller.enqueue(encoder.encode(msg.content))

          const toolCalls = msg.tool_calls || []
          if (toolCalls.length === 0) break

          // Append assistant turn (with tool_calls) to convo
          convo.push({
            role: "assistant",
            content: msg.content || "",
            ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
          } as any)

          for (const call of toolCalls) {
            const fnName = call.function?.name
            let args: any = {}
            try { args = JSON.parse(call.function?.arguments || "{}") } catch {}
            const label = fnName.replace(/_/g, " ")
            controller.enqueue(encoder.encode(`\n\n🔧 **${label}**: \`${JSON.stringify(args).slice(0, 120)}\`\n`))
            const result = await executeGitHubTool(fnName, args)
            controller.enqueue(encoder.encode(`> ${result}\n`))
            convo.push({
              role: "tool",
              tool_call_id: call.id,
              content: result,
            } as any)
          }
        }
      } catch (err: any) {
        controller.enqueue(encoder.encode(`\n\n**Error**: ${err.message}`))
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}

// ── Streaming providers (no tools) ──────────────────────────────────────────

async function callProvider(messages: Message[], model: string): Promise<Response> {
  const provider = detectProvider(model)

  if (provider === "xai") {
    const apiKey = process.env.XAI_API_KEY
    if (!apiKey) throw new Error("XAI_API_KEY not configured")
    return fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        stream: true,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    })
  }

  if (provider === "groq") {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) throw new Error("GROQ_API_KEY not configured")
    return fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        stream: true,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    })
  }

  if (provider === "ollama-cloud") {
    const apiKey = process.env.OLLAMA_CLOUD_API_KEY
    if (!apiKey) throw new Error("OLLAMA_CLOUD_API_KEY not configured")
    return fetch("https://ollama.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        stream: true,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    })
  }

  // Ollama (local/self-hosted)
  const apiUrl = process.env.OLLAMA_API_URL
  if (!apiUrl) throw new Error("OLLAMA_API_URL not configured")
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (process.env.OLLAMA_API_KEY)
    headers.Authorization = `Basic ${Buffer.from(`admin:${process.env.OLLAMA_API_KEY}`).toString("base64")}`
  return fetch(`${apiUrl}/api/chat`, {
    method: "POST",
    headers,
    signal: AbortSignal.timeout(55000),
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content, ...(m.images ? { images: m.images } : {}) })),
      stream: true,
    }),
  })
}

function extractToken(line: string, provider: Provider): string {
  if (!line.trim()) return ""

  // OpenAI-compatible SSE format (xAI, Groq, Ollama Cloud)
  if (provider === "xai" || provider === "groq" || provider === "ollama-cloud") {
    if (!line.startsWith("data: ")) return ""
    const raw = line.slice(6).trim()
    if (raw === "[DONE]") return ""
    try {
      const data = JSON.parse(raw)
      return data.choices?.[0]?.delta?.content || ""
    } catch { return "" }
  }

  // Anthropic SSE (unused here — handled by handleAnthropicWithTools)
  if (provider === "anthropic") {
    if (!line.startsWith("data: ")) return ""
    try {
      const data = JSON.parse(line.slice(6))
      return data.type === "content_block_delta" ? data.delta?.text || "" : ""
    } catch { return "" }
  }

  // Ollama NDJSON
  try {
    const data = JSON.parse(line)
    return data.message?.content || ""
  } catch { return "" }
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { messages, model = "llama3.1:8b", stream = true } = await req.json()

    const systemPrompt = process.env.SYSTEM_PROMPT
    const modelLine = `\nCURRENT MODEL: You are powered by ${model}. When asked what model you are, say exactly: "I'm Comfy AI, currently powered by ${model}. You can change models using the picker in the header."`
    const toolsNotice = modelSupportsTools(model) ? "" : `\n\n${NO_TOOLS_NOTICE}`
    const messagesWithSystem = systemPrompt?.trim()
      ? [{ role: "system", content: systemPrompt.trim() + modelLine + toolsNotice }, ...messages]
      : messages

    const provider = detectProvider(model)
    const { trimmed } = trimMessagesToFit(messagesWithSystem, model)

    // Anthropic: use Anthropic-flavoured tool loop
    if (provider === "anthropic") {
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 })
      return handleAnthropicWithTools(trimmed, model)
    }

    // Tool-capable Groq / xAI / Ollama Cloud: use OpenAI-flavoured tool loop
    if (
      modelSupportsTools(model) &&
      (provider === "groq" || provider === "xai" || provider === "ollama-cloud")
    ) {
      return handleOpenAIWithTools(trimmed, model, provider)
    }

    // All other providers (incl. weak/non-tool models): standard streaming
    const response = await callProvider(trimmed, model)

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: `${provider} error: ${errorText}` }, { status: response.status })
    }

    if (!stream) {
      const data = await response.json()
      let content = ""
      if (provider === "xai" || provider === "groq" || provider === "ollama-cloud")
        content = data.choices?.[0]?.message?.content || "No response"
      else
        content = data.message?.content || "No response"
      return NextResponse.json({ content })
    }

    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    const readableStream = new ReadableStream({
      async start(controller) {
        if (!response.body) { controller.close(); return }
        const reader = response.body.getReader()
        let buffer = ""
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split("\n")
            buffer = lines.pop() || ""
            for (const line of lines) {
              const token = extractToken(line, provider)
              if (token) controller.enqueue(encoder.encode(token))
            }
          }
          if (buffer.trim()) {
            const token = extractToken(buffer, provider)
            if (token) controller.enqueue(encoder.encode(token))
          }
        } catch (err) {
          controller.error(err)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 })
  }
}
