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
type Provider = "anthropic" | "xai" | "groq" | "deepseek" | "ollama-cloud"

const GROQ_MODEL_IDS = new Set([
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
  "mixtral-8x7b-32768",
  "llama-3.1-70b-versatile",
])

// Plug-and-play: add new OpenAI-compatible providers here only
const OPENAI_COMPAT: Record<string, { endpoint: string; envKey: string }> = {
  xai:            { endpoint: "https://api.x.ai/v1/chat/completions",            envKey: "XAI_API_KEY"          },
  groq:           { endpoint: "https://api.groq.com/openai/v1/chat/completions", envKey: "GROQ_API_KEY"         },
  deepseek:       { endpoint: "https://api.deepseek.com/v1/chat/completions",    envKey: "DEEPSEEK_API_KEY"     },
  "ollama-cloud": { endpoint: "https://ollama.com/v1/chat/completions",          envKey: "OLLAMA_CLOUD_API_KEY" },
}

function detectProvider(model: string): Provider {
  if (model.startsWith("claude-")) return "anthropic"
  if (model.startsWith("grok-")) return "xai"
  if (model.startsWith("deepseek-")) return "deepseek"
  if (GROQ_MODEL_IDS.has(model)) return "groq"
  return "ollama-cloud"
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

// ── Tool indicator helpers ───────────────────────────────────────────────────

function toolCallBanner(name: string, args: any): string {
  switch (name) {
    case "read_file":
      return `\n\`📂 Reading\` \`${args.path ?? args.file ?? "file"}\`${args.branch ? ` on \`${args.branch}\`` : ""}\n`
    case "update_file":
      return `\n\`✏️ Writing\` \`${args.path ?? "file"}\` — ${args.message?.slice(0, 60) ?? "updating"}\n`
    case "create_branch":
      return `\n\`🌿 Branch\` \`${args.branch}\` from \`${args.from_branch ?? "master"}\`\n`
    default:
      return `\n\`🔧 ${name.replace(/_/g, " ")}\` ${JSON.stringify(args).slice(0, 80)}\n`
  }
}

function toolResultBanner(name: string, result: string): string {
  if (name === "read_file") {
    const lines = result.split("\n").length
    return `\`✓ ${lines} lines loaded\`\n\n`
  }
  if (name === "update_file") return `\`✓ File committed\`\n\n`
  if (name === "create_branch") return `\`✓ Branch ready\`\n\n`
  return result.length > 300 ? `\`✓ Done\`\n\n` : `${result}\n\n`
}

// ── Anthropic handler with tool loop ────────────────────────────────────────

function handleAnthropicWithTools(messages: Message[], model: string, toolsEnabled: boolean): Response {
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
              ...(toolsEnabled ? { tools: anthropicTools } : {}),
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
            controller.enqueue(encoder.encode(toolCallBanner(toolUse.name, toolUse.input)))
            const result = await executeGitHubTool(toolUse.name, toolUse.input)
            controller.enqueue(encoder.encode(toolResultBanner(toolUse.name, result)))
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

function handleOpenAIWithTools(messages: Message[], model: string, provider: Provider): Response {
  const encoder = new TextEncoder()
  const cfg = OPENAI_COMPAT[provider]
  const endpoint = cfg?.endpoint ?? ""
  const apiKey = cfg ? (process.env[cfg.envKey] ?? "") : ""

  let convo: any[] = messages.map((m) => ({ role: m.role, content: m.content }))

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for (let i = 0; i < 6; i++) {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
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
            controller.enqueue(encoder.encode(`**Error**: ${provider} error: ${errText}`))
            break
          }

          const data = await res.json()
          const msg = data.choices?.[0]?.message
          if (!msg) break

          if (msg.content) controller.enqueue(encoder.encode(msg.content))

          const toolCalls = msg.tool_calls || []
          if (toolCalls.length === 0) break

          // Echo assistant's tool_calls into convo for next turn
          convo.push({
            role: "assistant",
            content: msg.content || "",
            tool_calls: toolCalls,
          })

          for (const tc of toolCalls) {
            const fnName = tc.function?.name
            let args: any = {}
            try { args = JSON.parse(tc.function?.arguments || "{}") } catch {}
            controller.enqueue(encoder.encode(toolCallBanner(fnName, args)))
            const result = await executeGitHubTool(fnName, args)
            controller.enqueue(encoder.encode(toolResultBanner(fnName, result)))
            convo.push({
              role: "tool",
              tool_call_id: tc.id,
              content: result,
            })
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

  // All non-Anthropic providers are OpenAI-compatible — use plug-and-play config
  const cfg = OPENAI_COMPAT[provider]
  if (!cfg) throw new Error(`Unknown provider: ${provider}`)
  const apiKey = process.env[cfg.envKey]
  if (!apiKey) throw new Error(`${cfg.envKey} not configured`)
  return fetch(cfg.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      stream: true,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  })
}

function extractToken(line: string, provider: Provider): string {
  if (!line.trim()) return ""

  if (provider === "xai" || provider === "groq" || provider === "ollama-cloud" || provider === "deepseek") {
    if (!line.startsWith("data: ")) return ""
    const raw = line.slice(6).trim()
    if (raw === "[DONE]") return ""
    try {
      const data = JSON.parse(raw)
      return data.choices?.[0]?.delta?.content || ""
    } catch { return "" }
  }

  if (provider === "anthropic") {
    if (!line.startsWith("data: ")) return ""
    try {
      const data = JSON.parse(line.slice(6))
      return data.type === "content_block_delta" ? data.delta?.text || "" : ""
    } catch { return "" }
  }

  try {
    const data = JSON.parse(line)
    return data.message?.content || ""
  } catch { return "" }
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { messages, model = "llama3.1:8b", stream = true } = await req.json()

    const toolsEnabled = modelSupportsTools(model)

    const baseSystem = process.env.SYSTEM_PROMPT?.trim() || ""
    const modelLine = `\nCURRENT MODEL: You are powered by ${model}. When asked what model you are, say exactly: "I'm Comfy AI, currently powered by ${model}. You can change models using the picker in the header."`
    const toolsNotice = toolsEnabled ? "" : `\n\n${NO_TOOLS_NOTICE}`
    const finalSystem = baseSystem + modelLine + toolsNotice

    const messagesWithSystem = finalSystem
      ? [{ role: "system", content: finalSystem }, ...messages]
      : messages

    const provider = detectProvider(model)
    const { trimmed } = trimMessagesToFit(messagesWithSystem, model)

    // Anthropic: tool loop (tools gated by toolsEnabled)
    if (provider === "anthropic") {
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 })
      return handleAnthropicWithTools(trimmed, model, toolsEnabled)
    }

    // Tool-capable OpenAI-compatible providers
    if (toolsEnabled) {
      return handleOpenAIWithTools(trimmed, model, provider)
    }

    // Everyone else: plain streaming (no tools)
    const response = await callProvider(trimmed, model)

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: `${provider} error: ${errorText}` }, { status: response.status })
    }

    if (!stream) {
      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || "No response"
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
