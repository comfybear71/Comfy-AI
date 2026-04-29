import { NextRequest } from "next/server"
import { callModelText } from "@/lib/call-model"
import { AGENTS, AGENT_MAP } from "@/lib/agents"
import type { AgentId, CouncilEvent, AgentModels } from "@/lib/council-types"

interface RequestBody {
  task: string
  selectedModel: string
  agentModels?: Partial<AgentModels>
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

export async function POST(req: NextRequest) {
  const body = (await req.json()) as RequestBody
  const { task, selectedModel, agentModels = {} } = body

  if (!task?.trim()) {
    return new Response(JSON.stringify({ error: "task is required" }), { status: 400 })
  }

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
        // ── 1. Planner ──────────────────────────────────────────────────────
        emit({ event: "status", agentId: "planner", status: "thinking" })
        const plannerText = await callModelText(modelFor("planner"), [
          { role: "system", content: AGENT_MAP.planner.systemPrompt },
          { role: "user", content: `Task: ${task}` },
        ])
        const fileOps = parseFileOps(plannerText)
        const plannerClean = stripFilesBlock(plannerText)
        emit({ event: "message", agentId: "planner", content: plannerClean })
        for (const op of fileOps) {
          emit({ event: "file-op", agentId: "planner", op: op.type, filename: op.path })
        }
        emit({ event: "status", agentId: "planner", status: "approved" })

        // ── 2. Coder ────────────────────────────────────────────────────────
        emit({ event: "status", agentId: "coder", status: "thinking" })
        const coderText = await callModelText(modelFor("coder"), [
          { role: "system", content: AGENT_MAP.coder.systemPrompt },
          { role: "user", content: `Task: ${task}\n\nPlan:\n${plannerClean}` },
        ])
        emit({ event: "message", agentId: "coder", content: coderText })
        emit({ event: "status", agentId: "coder", status: "approved" })

        // ── 3-5. Voting agents ──────────────────────────────────────────────
        const fullContext = `Task: ${task}\n\nPlan:\n${plannerClean}\n\nCode approach:\n${coderText}`
        const voteAgentIds: AgentId[] = ["reviewer", "security", "perf"]
        const scores: number[] = []

        for (const agentId of voteAgentIds) {
          emit({ event: "status", agentId, status: "reviewing" })
          const def = AGENT_MAP[agentId]
          const voteText = await callModelText(modelFor(agentId), [
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
        emit({ event: "complete", avgScore, plan })
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
