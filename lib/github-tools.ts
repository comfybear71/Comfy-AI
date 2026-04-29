// Shared GitHub tool definitions, executor, and model gating.
// Used by all providers (Anthropic, xAI/Grok, Groq, Ollama, Ollama Cloud).
//
// Anthropic uses its own tool schema (anthropicTools).
// All other providers use the OpenAI-compatible function-calling schema (openaiTools).

// ── Models that reliably support tool calling ────────────────────────────────
// Weak models (small Llamas, Phi, CodeLlama) hallucinate tool calls instead of
// emitting structured tool_use blocks. We hide tools from them entirely so the
// assistant has to admit it can't do GitHub actions rather than lie about it.

export const TOOL_CAPABLE_MODELS = new Set<string>([
  // Anthropic — all Claude 4.x models support tools
  "claude-opus-4-7",
  "claude-sonnet-4-6",
  "claude-haiku-4-5-20251001",
  "claude-opus-4-5",
  "claude-sonnet-4-5",
  // xAI — Grok 3 family supports tools, Grok 2 does not reliably
  "grok-3",
  "grok-3-mini",
  // Groq — only the 70B versatile model handles tools well
  "llama-3.3-70b-versatile",
  "llama-3.1-70b-versatile",
  // Ollama Cloud — large MoE models with native tool support
  "kimi-k2:1t-cloud",
  "kimi-k2-thinking",
  "deepseek-v3.1:671b-cloud",
  "qwen3-coder:480b-cloud",
  "gpt-oss:120b-cloud",
  // Local Ollama — only the larger tool-trained models
  "llama3.1:8b",
  "llama3.1:70b",
  "qwen2.5-coder:7b",
  "mistral:7b",
])

export function modelSupportsTools(model: string): boolean {
  return TOOL_CAPABLE_MODELS.has(model)
}

// Maximum characters returned by read_file in a single call.
// Bumped from 8 000 → 50 000 to fit ~1 200 lines of typical TS/TSX code,
// covering ~95 % of real files. For larger files use start_line / end_line.
const READ_FILE_MAX_CHARS = 50_000

// ── Anthropic-flavoured tool schema ──────────────────────────────────────────

export const anthropicTools = [
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
    description:
      "Read the content of a file from a GitHub repository branch. Returns up to 50,000 characters. " +
      "For larger files, use start_line and end_line to read a specific range.",
    input_schema: {
      type: "object" as const,
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        path: { type: "string", description: "File path within the repo (e.g. components/foo.tsx)" },
        branch: { type: "string", description: "Branch to read from (default: master)" },
        start_line: { type: "number", description: "Optional: 1-indexed line to start reading from" },
        end_line: { type: "number", description: "Optional: 1-indexed line to stop at (inclusive)" },
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

// ── OpenAI-compatible tool schema (Groq, xAI, Ollama, Ollama Cloud) ──────────

export const openaiTools = anthropicTools.map((t) => ({
  type: "function" as const,
  function: {
    name: t.name,
    description: t.description,
    parameters: t.input_schema,
  },
}))

// ── Executor (provider-agnostic) ─────────────────────────────────────────────

export async function executeGitHubTool(name: string, input: any): Promise<string> {
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
      const fullContent = Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf-8")

      // Optional line-range slicing
      const { start_line, end_line } = input
      let content = fullContent
      let header = `\`${input.path}\` (${branch})`
      if (typeof start_line === "number" || typeof end_line === "number") {
        const lines = fullContent.split("\n")
        const start = Math.max(1, start_line ?? 1)
        const end = Math.min(lines.length, end_line ?? lines.length)
        content = lines.slice(start - 1, end).join("\n")
        header = `\`${input.path}\` (${branch}, lines ${start}-${end} of ${lines.length})`
      }

      // Truncate if still too large, with a clear notice
      const truncated = content.length > READ_FILE_MAX_CHARS
      const shown = truncated ? content.slice(0, READ_FILE_MAX_CHARS) : content
      const notice = truncated
        ? `\n\n…[truncated at ${READ_FILE_MAX_CHARS.toLocaleString()} chars — use start_line/end_line to read more]`
        : ""

      return `${header}:\n\`\`\`\n${shown}${notice}\n\`\`\``
    }

    if (name === "update_file") {
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

// ── System prompt addendum for non-tool-capable models ───────────────────────
// Inject this into the system prompt when modelSupportsTools(model) === false
// so the model knows it cannot create branches or commit files and must tell
// the user to switch models instead of hallucinating success.

export const NO_TOOLS_NOTICE = `
IMPORTANT: GitHub actions (creating branches, reading files, committing changes)
are NOT available on this model. If the user asks you to perform a GitHub action,
you MUST tell them clearly that this model cannot do it and suggest they switch
to a tool-capable model (Claude Opus/Sonnet/Haiku, Grok 3, Llama 3.3 70B, or
the larger Ollama Cloud models). Never claim to have created a branch or
committed a file — you cannot.
`.trim()
