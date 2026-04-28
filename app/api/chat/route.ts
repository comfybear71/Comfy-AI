import { NextRequest, NextResponse } from "next/server"
import { trimMessagesToFit } from "@/lib/tokens"

type Message = { role: string; content: string; images?: string[] }
type Provider = "anthropic" | "xai" | "ollama"

function detectProvider(model: string): Provider {
  if (model.startsWith("claude-")) return "anthropic"
  if (model.startsWith("grok-")) return "xai"
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

// ── GitHub tools for Anthropic tool use ─────────────────────────────────────

const GITHUB_TOOLS = [
  {
    name: "create_branch",
    description:
      "Create a new git branch in a GitHub repository. Always use claude/ prefix for branch names (e.g. claude/fix-button).",
    input_schema: {
      type: "object" as const,
      properties: {
        owner: { type: "string", description: "Repository owner username" },
        repo: { type: "string", description: "Repository name" },
        branch: { type: "string", description: "New branch name, must start with claude/" },
        from_branch: { type: "string", description: "Base branch to branch from (default: master)" },
      },
      required: ["owner", "repo", "branch"],
    },
  },
  {
    name: "read_file",
    description: "Read the full content of a file from a GitHub repository branch.",
    input_schema: {
      type: "object" as const,
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        path: { type: "string", description: "File path within the repo (e.g. components/foo.tsx)" },
        branch: { type: "string", description: "Branch to read from (default: master)" },
      },
      required: ["owner", "repo", "path"],
    },
  },
  {
    name: "update_file",
    description:
      "Create or update a file in a GitHub repository with a commit. Use this to make code changes on a branch.",
    input_schema: {
      type: "object" as const,
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        path: { type: "string", description: "File path (e.g. app/page.tsx)" },
        content: { type: "string", description: "Complete new file content" },
        message: { type: "string", description: "Git commit message" },
        branch: { type: "string", description: "Branch to commit to (must already exist)" },
      },
      required: ["owner", "repo", "path", "content", "message", "branch"],
    },
  },
]

async function executeGitHubTool(name: string, input: any): Promise<string> {
  const GH = "https://api.github.com"
  const token = process.env.GITHUB_TOKEN
  if (!token) return "Error: GITHUB_TOKEN not configured"
  const headers: Record<string, string> = {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
    "User-Agent": "Comfy-AI",
  }
  const { owner, repo } = input

  try {
    if (name === "create_branch") {
      const base = input.from_branch || "master"
      const refRes = await fetch(`${GH}/repos/${owner}/${repo}/git/refs/heads/${base}`, { headers })
      if (!refRes.ok) return `Error: Cannot find base branch \`${base}\``
      const refData = await refRes.json()
      const sha = refData.object?.sha
      const createRes = await fetch(`${GH}/repos/${owner}/${repo}/git/refs`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ref: `refs/heads/${input.branch}`, sha }),
      })
      if (!createRes.ok) {
        const e = await createRes.json()
        return `Error: ${e.message}`
      }
      return `Branch \`${input.branch}\` created from \`${base}\``
    }

    if (name === "read_file") {
      const branch = input.branch || "master"
      const res = await fetch(
        `${GH}/repos/${owner}/${repo}/contents/${input.path}?ref=${encodeURIComponent(branch)}`,
        { headers }
      )
      if (!res.ok) return `Error: File not found at \`${input.path}\` on \`${branch}\``
      const data = await res.json()
      if (Array.isArray(data)) return `Error: \`${input.path}\` is a directory`
      const content = Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf-8")
      return `\`${input.path}\` (${branch}):\n\`\`\`\n${content.slice(0, 8000)}\n\`\`\``
    }

    if (name === "update_file") {
      // Get current SHA for updates
      let sha: string | undefined
      try {
        const getRes = await fetch(
          `${GH}/repos/${owner}/${repo}/contents/${input.path}?ref=${encodeURIComponent(input.branch)}`,
          { headers }
        )
        if (getRes.ok) {
          const d = await getRes.json()
          if (!Array.isArray(d)) sha = d.sha
        }
      } catch {}

      const body: any = {
        message: input.message,
        content: Buffer.from(input.content).toString("base64"),
        branch: input.branch,
      }
      if (sha) body.sha = sha

      const putRes = await fetch(`${GH}/repos/${owner}/${repo}/contents/${input.path}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
      })
      if (!putRes.ok) {
        const e = await putRes.json()
        return `Error: ${e.message}`
      }
      const putData = await putRes.json()
      return `Committed \`${input.path}\` to \`${input.branch}\` (${putData.commit?.sha?.slice(0, 7)})`
    }

    return `Unknown tool: ${name}`
  } catch (err: any) {
    return `Error: ${err.message}`
  }
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
              tools: GITHUB_TOOLS,
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

          // Any text from this turn
          if (textBlock?.text) controller.enqueue(encoder.encode(textBlock.text))

          // Done — no tool calls
          if (toolUseBlocks.length === 0) break

          // Execute each tool and stream status
          const toolResults: any[] = []
          for (const toolUse of toolUseBlocks) {
            const label = toolUse.name.replace(/_/g, " ")
            controller.enqueue(encoder.encode(`\n\n🔧 **${label}**: \`${JSON.stringify(toolUse.input).slice(0, 120)}\`\n`))
            const result = await executeGitHubTool(toolUse.name, toolUse.input)
            controller.enqueue(encoder.encode(`> ${result}\n`))
            toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: result })
          }

          // Append to conversation and loop
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

// ── Non-Anthropic provider (Ollama + xAI) ───────────────────────────────────

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

  // Ollama
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
  if (provider === "anthropic") {
    if (!line.startsWith("data: ")) return ""
    try {
      const data = JSON.parse(line.slice(6))
      return data.type === "content_block_delta" ? data.delta?.text || "" : ""
    } catch { return "" }
  }
  if (provider === "xai") {
    if (!line.startsWith("data: ")) return ""
    const raw = line.slice(6).trim()
    if (raw === "[DONE]") return ""
    try {
      const data = JSON.parse(raw)
      return data.choices?.[0]?.delta?.content || ""
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

    const systemPrompt = process.env.SYSTEM_PROMPT
    const messagesWithSystem = systemPrompt?.trim()
      ? [{ role: "system", content: systemPrompt.trim() }, ...messages]
      : messages

    const provider = detectProvider(model)
    const { trimmed } = trimMessagesToFit(messagesWithSystem, model)

    // Anthropic: use tool loop handler
    if (provider === "anthropic") {
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 })
      return handleAnthropicWithTools(trimmed, model)
    }

    // Ollama / xAI: standard streaming
    const response = await callProvider(trimmed, model)

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: `${provider} error: ${errorText}` }, { status: response.status })
    }

    if (!stream) {
      const data = await response.json()
      let content = ""
      if (provider === "xai") content = data.choices?.[0]?.message?.content || "No response"
      else content = data.message?.content || "No response"
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
