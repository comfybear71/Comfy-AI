type SimpleMessage = { role: string; content: string }
type Provider = "anthropic" | "xai" | "ollama" | "groq" | "ollama-cloud"

const GROQ_IDS = new Set([
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
  "mixtral-8x7b-32768",
  "llama-3.1-70b-versatile",
])

function detectProvider(model: string): Provider {
  if (model.startsWith("claude-")) return "anthropic"
  if (model.startsWith("grok-")) return "xai"
  if (GROQ_IDS.has(model)) return "groq"
  if (model.endsWith(":cloud") || model.endsWith("-cloud") || model.endsWith("-thinking")) return "ollama-cloud"
  return "ollama"
}

// Single non-streaming call — returns the full assistant text.
export async function callModelText(
  model: string,
  messages: SimpleMessage[],
  signal?: AbortSignal
): Promise<string> {
  const provider = detectProvider(model)

  if (provider === "anthropic") {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured")
    const system = messages.find((m) => m.role === "system")?.content
    const convo = messages.filter((m) => m.role !== "system").map((m) => ({
      role: m.role === "assistant" ? "assistant" : ("user" as const),
      content: m.content,
    }))
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 2048, stream: false, ...(system ? { system } : {}), messages: convo }),
      signal,
    })
    if (!res.ok) throw new Error(`Anthropic: ${await res.text()}`)
    const data = await res.json()
    return data.content?.find((b: any) => b.type === "text")?.text ?? ""
  }

  if (provider === "groq" || provider === "xai" || provider === "ollama-cloud") {
    const cfg: Record<string, { endpoint: string; key: string | undefined }> = {
      groq:         { endpoint: "https://api.groq.com/openai/v1/chat/completions", key: process.env.GROQ_API_KEY },
      xai:          { endpoint: "https://api.x.ai/v1/chat/completions", key: process.env.XAI_API_KEY },
      "ollama-cloud": { endpoint: "https://ollama.com/v1/chat/completions", key: process.env.OLLAMA_CLOUD_API_KEY },
    }
    const { endpoint, key } = cfg[provider]
    if (!key) throw new Error(`${provider} API key not configured`)
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, stream: false, messages: messages.map((m) => ({ role: m.role, content: m.content })) }),
      signal,
    })
    if (!res.ok) throw new Error(`${provider}: ${await res.text()}`)
    const data = await res.json()
    return data.choices?.[0]?.message?.content ?? ""
  }

  // Ollama local
  const apiUrl = process.env.OLLAMA_API_URL
  if (!apiUrl) throw new Error("OLLAMA_API_URL not configured")
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (process.env.OLLAMA_API_KEY)
    headers.Authorization = `Basic ${Buffer.from(`admin:${process.env.OLLAMA_API_KEY}`).toString("base64")}`
  const res = await fetch(`${apiUrl}/api/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({ model, stream: false, messages: messages.map((m) => ({ role: m.role, content: m.content })) }),
    signal: signal ?? AbortSignal.timeout(55000),
  })
  if (!res.ok) throw new Error(`Ollama: ${await res.text()}`)
  const data = await res.json()
  return data.message?.content ?? ""
}
