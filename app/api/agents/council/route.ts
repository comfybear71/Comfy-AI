import { NextRequest } from "next/server"
import { callModelText } from "@/lib/call-model"
import { AGENTS, AGENT_MAP } from "@/lib/agents"
import type { AgentId, CouncilEvent, AgentModels } from "@/lib/council-types"
import { COUNCIL_FALLBACK_MODEL } from "@/lib/models"
import { getDb } from "@/lib/db"
import { councilLessons } from "@/lib/schema"
import { desc, sql } from "drizzle-orm"
import { createHash } from "crypto"

interface RequestBody {
  task: string
  selectedModel: string
  agentModels?: Partial<AgentModels>
  recentTaskHashes?: string[] // for loop detection
}

function hashTask(task: string): string {
  return createHash("sha256").update(task.trim().toLowerCase()).digest("hex").slice(0, 16)
}

// Self-healing model call — if the chosen model returns "not found", retries with fallback
async function safeCall(
  model: string,
  messages: { role: string; content: string }[],
  signal?: AbortSignal
): Promise<string> {
  try {
    return await callModelText(model, messages, signal)
  } catch (err: any) {
    const msg: string = err?.message ?? ""
    const isNotFound = msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("does not exist")
    if (isNotFound && model !== COUNCIL_FALLBACK_MODEL) {
      console.warn(`[council] model "${model}" not found — falling back to ${COUNCIL_FALLBACK_MODEL}`)
      return await callModelText(COUNCIL_FALLBACK_MODEL, messages, signal)
    }
    throw err
  }
}

function parseFileOps(text: string): { type: "reading" | "writing"; path: string }[] {
  const block = text.match(/<files>([\s\S]*?)<\/files>/)
  if (!block) return []
  return block[1]
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .flatMap((l) => {
      const m = l.match(/^(reading|writing):\s*(.+)$/)
      return m ? [{ type: m[1] as "reading" | "writing", path: m[2].trim() }] : []
    })
}

function parseVote(text: string): { score: number; reasoning: string } {
  const scoreMatch = text.match(/Score:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i)
  const score = scoreMatch ? Math.min(10, Math.max(1, parseFloat(scoreMatch[1]))) : 5
  const reasoningMatch = text.match(/Reasoning:\s*(.+?)(?:\n|$)/i)
  const reasoning = reasoningMatch ? reasoningMatch[1].trim() : text.split("\n")[0]?.trim() || "No reasoning"
  return { score, reasoning }
}

function stripFilesBlock(text: string): string {
  return text.replace(/<files>[\s\S]*?<\/files>/g, "").trim()
}

async function loadRecentLessons(limit = 3): Promise<string> {
  try {
    const db = getDb()
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS council_lessons (
        id SERIAL PRIMARY KEY,
        task_hash VARCHAR(64) NOT NULL,
        task TEXT NOT NULL,
        lesson TEXT NOT NULL,
        avg_score VARCHAR(10),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `)
    const rows = await db
      .select({ lesson: councilLessons.lesson, avgScore: councilLessons.avgScore })
      .from(councilLessons)
      .orderBy(desc(councilLessons.createdAt))
      .limit(limit)
    if (rows.length === 0) return ""
    const items = rows.map((r, i) => `${i + 1}. ${r.lesson}${r.avgScore ? ` (score: ${r.avgScore}/10)` : ""}`).join("\n")
    return `\n\n## Lessons from past council runs (apply these):\n${items}`
  } catch {
    return ""
  }
}

async function saveLesson(taskHash: string, task: string, lesson: string, avgScore: string) {
  try {
    const db = getDb()
    await db.insert(councilLessons).values({ taskHash, task, lesson, avgScore })
  } catch {
    // non-fatal — lessons are best-effort
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as RequestBody
  const { task, selectedModel, agentModels = {}, recentTaskHashes = [] } = body

  if (!task?.trim()) {
    return new Response(JSON.stringify({ error: "task is required" }), { status: 400 })
  }

  const taskHash = hashTask(task)
  const encoder = new TextEncoder()
  let closed = false

  const stream = new ReadableStream({
    async start(controller) {
      function emit(event: CouncilEvent) {
        if (closed) return
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"))
      }

      function modelFor(id: AgentId): string {
        return agentModels[id] || selectedModel
      }

      try {
        // ── Loop detection ───────────────────────────────────────────────────
        const recentCount = recentTaskHashes.filter((h) => h === taskHash).length
        if (recentCount >= 2) {
          emit({ event: "loop-detected", lastSeen: recentCount })
          closed = true
          controller.close()
          return
        }

        // ── Load lessons from past runs ──────────────────────────────────────
        const lessonsContext = await loadRecentLessons(3)

        // ── Phase: planning ─────────────────────────────────────────────────
        emit({ event: "phase", phase: "planning" })
        emit({ event: "status", agentId: "planner", status: "thinking" })
        const plannerText = await safeCall(modelFor("planner"), [
          { role: "system", content: AGENT_MAP.planner.systemPrompt + lessonsContext },
          { role: "user", content: `Task: ${task}` },
        ])
        const fileOps = parseFileOps(plannerText)
        const plannerClean = stripFilesBlock(plannerText)
        emit({ event: "message", agentId: "planner", content: plannerClean })
        for (const op of fileOps) {
          emit({ event: "file-op", agentId: "planner", op: op.type, filename: op.path })
        }
        emit({ event: "status", agentId: "planner", status: "approved" })

        // ── Phase: coding ───────────────────────────────────────────────────
        emit({ event: "phase", phase: "coding" })
        emit({ event: "status", agentId: "coder", status: "thinking" })
        const coderText = await safeCall(modelFor("coder"), [
          { role: "system", content: AGENT_MAP.coder.systemPrompt + lessonsContext },
          { role: "user", content: `Task: ${task}\n\nPlan:\n${plannerClean}` },
        ])
        emit({ event: "message", agentId: "coder", content: coderText })
        emit({ event: "status", agentId: "coder", status: "approved" })

        // ── Phase: reviewing ────────────────────────────────────────────────
        emit({ event: "phase", phase: "reviewing" })
        const fullContext = `Task: ${task}\n\nPlan:\n${plannerClean}\n\nCode approach:\n${coderText}`
        const voteAgentIds: AgentId[] = ["reviewer", "security", "perf"]
        const scores: number[] = []

        for (const agentId of voteAgentIds) {
          emit({ event: "status", agentId, status: "reviewing" })
          const def = AGENT_MAP[agentId]
          const voteText = await safeCall(modelFor(agentId), [
            { role: "system", content: def.systemPrompt },
            { role: "user", content: fullContext },
          ])
          const { score, reasoning } = parseVote(voteText)
          scores.push(score)
          emit({ event: "vote", agentId, score, reasoning })
          emit({ event: "status", agentId, status: score >= 6 ? "approved" : "needs-discussion" })
        }

        const avgScore = Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10
        const plan = `${plannerClean}\n\n---\n\n**Code approach:**\n${coderText}`

        // ── Phase: awaiting human approval ──────────────────────────────────
        emit({ event: "phase", phase: "awaiting-human" })
        emit({ event: "complete", avgScore, plan })

        // ── Phase: reflecting (runs in background, after complete event) ────
        emit({ event: "phase", phase: "reflecting" })
        try {
          const reflectorPrompt = `You are the Reflector agent. After a council session, write ONE concise lesson (max 2 sentences) that future council runs should remember about this type of task. Focus on what worked, what to avoid, or a key insight.

Task: ${task}
Plan quality: ${plannerClean.slice(0, 300)}
Avg score: ${avgScore}/10

Output format:
Lesson: <your one lesson here>`

          const reflectText = await safeCall(modelFor("planner"), [
            { role: "system", content: reflectorPrompt },
            { role: "user", content: "Write the lesson." },
          ])
          const lessonMatch = reflectText.match(/Lesson:\s*(.+)/i)
          const lesson = lessonMatch ? lessonMatch[1].trim() : reflectText.split("\n")[0]?.trim() || ""
          if (lesson) {
            emit({ event: "lesson", content: lesson })
            await saveLesson(taskHash, task.slice(0, 500), lesson, String(avgScore))
          }
        } catch {
          // reflection is best-effort, don't fail the run
        }

        emit({ event: "phase", phase: "done" })
      } catch (err: any) {
        emit({ event: "error", agentId: "planner", message: err.message || "Council failed" })
      } finally {
        closed = true
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
