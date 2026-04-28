import { NextRequest, NextResponse } from "next/server"
import { trimMessagesToFit } from "@/lib/tokens"

type Message = { role: string; content: string; images?: string[] }
type Provider = "anthropic" | "xai" | "ollama"

function detectProvider(model: string): Provider {
  if (model.startsWith("claude-")) return "anthropic"
  if (model.startsWith("grok-")) return "xai"
  return "ollama"
}

// Anthropic requires a specific message format for images
function toAnthropicMessages(messages: Message[]) {
  return messages
    .filter((m) => m.role !== "system")
    .map((m) => {
      const role = m.role === "assistant" ? "assistant" : "user"
      if (m.images && m.images.length > 0) {
        const content: any[] = m.images.map((img) => ({
          type: "image",
          source: { type: "base64", media_type: "image/jpeg", data: img },
        }))
        if (m.content) content.push({ type: "text", text: m.content })
        return { role, content }
      }
      return { role, content: m.content }
    })
}

async function callProvider(messages: Message[], model: string): Promise<Response> {
  const provider = detectProvider(model)

  if (provider === "anthropic") {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured")
    const system = messages.find((m) => m.role === "system")?.content
    return fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 8192,
        stream: true,
        ...(system ? { system } : {}),
        messages: toAnthropicMessages(messages),
      }),
    })
  }

  if (provider === "xai") {
    const apiKey = process.env.XAI_API_KEY
    if (!apiKey) throw new Error("XAI_API_KEY not configured")
    return fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    })
  }

  // Ollama
  const apiUrl = process.env.OLLAMA_API_URL
  if (!apiUrl) throw new Error("OLLAMA_API_URL not configured")
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (process.env.OLLAMA_API_KEY) {
    headers.Authorization = `Basic ${Buffer.from(`admin:${process.env.OLLAMA_API_KEY}`).toString("base64")}`
  }
  return fetch(`${apiUrl}/api/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.images ? { images: m.images } : {}),
      })),
      stream: true,
    }),
  })
}

function extractToken(line: string, provider: Provider): string {
  if (!line.trim()) return ""

  if (provider === "anthropic") {
    if (!line.startsWith("data: ")) return ""
    try {
      const data = JSON.parse(line.slice(6))
      return data.type === "content_block_delta" ? data.delta?.text || "" : ""
    } catch {
      return ""
    }
  }

  if (provider === "xai") {
    if (!line.startsWith("data: ")) return ""
    const raw = line.slice(6).trim()
    if (raw === "[DONE]") return ""
    try {
      const data = JSON.parse(raw)
      return data.choices?.[0]?.delta?.content || ""
    } catch {
      return ""
    }
  }

  // Ollama: newline-delimited JSON
  try {
    const data = JSON.parse(line)
    return data.message?.content || ""
  } catch {
    return ""
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messages, model = "llama3.1:8b", stream = true } = await req.json()

    const systemPrompt = process.env.SYSTEM_PROMPT
    const messagesWithSystem = systemPrompt?.trim()
      ? [{ role: "system", content: systemPrompt.trim() }, ...messages]
      : messages

    const provider = detectProvider(model)
    const { trimmed } = trimMessagesToFit(messagesWithSystem, model)

    const response = await callProvider(trimmed, model)

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: `${provider} error: ${errorText}` },
        { status: response.status }
      )
    }

    if (!stream) {
      const data = await response.json()
      let content = ""
      if (provider === "anthropic") content = data.content?.[0]?.text || "No response"
      else if (provider === "xai") content = data.choices?.[0]?.message?.content || "No response"
      else content = data.message?.content || "No response"
      return NextResponse.json({ content })
    }

    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    const readableStream = new ReadableStream({
      async start(controller) {
        if (!response.body) {
          controller.close()
          return
        }
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
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    )
  }
}
