"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { Users, X, ChevronDown, CheckCircle, XCircle, Loader2, RotateCcw, AlertTriangle, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { AgentCard } from "./AgentCard"
import { DiscussionFeed } from "./DiscussionFeed"
import { AGENTS } from "@/lib/agents"
import { estimateAgentCost, getModel, TIER_COLORS } from "@/lib/models"
import type { AgentId, AgentModels, AgentState, CouncilEvent, CouncilPhase, FeedEntry } from "@/lib/council-types"

const DEFAULT_AGENT_STATES = (): Record<AgentId, AgentState> => ({
  planner:   { status: "idle" },
  coder:     { status: "idle" },
  reviewer:  { status: "idle" },
  security:  { status: "idle" },
  perf:      { status: "idle" },
  reflector: { status: "idle" },
})

const PHASE_LABELS: Record<CouncilPhase, string> = {
  "idle":           "Ready",
  "planning":       "Planning…",
  "coding":         "Coding…",
  "reviewing":      "Reviewing…",
  "awaiting-human": "Awaiting your approval",
  "reflecting":     "Learning…",
  "done":           "Done",
}

const PHASE_COLORS: Record<CouncilPhase, string> = {
  "idle":           "text-gray-500",
  "planning":       "text-blue-400",
  "coding":         "text-emerald-400",
  "reviewing":      "text-amber-400",
  "awaiting-human": "text-purple-400",
  "reflecting":     "text-sky-400",
  "done":           "text-gray-400",
}

function hashTask(task: string): string {
  // djb2 — browser-safe, no Node crypto needed
  let h = 5381
  for (let i = 0; i < task.length; i++) h = ((h << 5) + h) ^ task.charCodeAt(i)
  return (h >>> 0).toString(36)
}

interface CouncilPanelProps {
  task: string
  selectedModel: string
  open: boolean
  onClose: () => void
  onApprove: (plan: string) => void
}

export function CouncilPanel({ task, selectedModel, open, onClose, onApprove }: CouncilPanelProps) {
  const [agentModels, setAgentModels] = useState<AgentModels>(() =>
    Object.fromEntries(AGENTS.map((a) => [a.id, a.defaultModel])) as AgentModels
  )
  const [agentStates, setAgentStates] = useState<Record<AgentId, AgentState>>(DEFAULT_AGENT_STATES)
  const [feed, setFeed] = useState<FeedEntry[]>([])
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState<CouncilPhase>("idle")
  const [avgScore, setAvgScore] = useState<number | null>(null)
  const [plan, setPlan] = useState<string | null>(null)
  const [lesson, setLesson] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loopDetected, setLoopDetected] = useState(false)
  const [collapsed, setCollapsed] = useState(true)

  const abortRef = useRef<AbortController | null>(null)
  const runningTaskRef = useRef<string>("")
  // Session-scoped task hash history for loop detection
  const taskHashHistoryRef = useRef<string[]>([])
  const runCouncilRef = useRef<(t: string) => Promise<void>>(() => Promise.resolve())

  const setAgentStatus = useCallback((agentId: AgentId, patch: Partial<AgentState>) => {
    setAgentStates((prev) => ({ ...prev, [agentId]: { ...prev[agentId], ...patch } }))
  }, [])

  const addFeed = useCallback((entry: Omit<FeedEntry, "id">) => {
    setFeed((prev) => [...prev, { ...entry, id: `${Date.now()}-${Math.random()}` }])
  }, [])

  const runCouncil = useCallback(async (taskText: string) => {
    if (!taskText?.trim()) return

    if (abortRef.current) abortRef.current.abort()
    const abort = new AbortController()
    abortRef.current = abort
    runningTaskRef.current = taskText

    setRunning(true)
    setCollapsed(false)
    setPhase("idle")
    setAvgScore(null)
    setPlan(null)
    setLesson(null)
    setError(null)
    setLoopDetected(false)
    setFeed([])
    setAgentStates(DEFAULT_AGENT_STATES())

    const recentTaskHashes = [...taskHashHistoryRef.current]

    try {
      const res = await fetch("/api/agents/council", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abort.signal,
        body: JSON.stringify({ task: taskText, selectedModel, agentModels, recentTaskHashes }),
      })

      if (!res.ok || !res.body) {
        const msg = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        setError(msg.error || `HTTP ${res.status}`)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const evt = JSON.parse(line) as CouncilEvent
            handleEvent(evt)
          } catch {}
        }
      }

      // Record this task hash after a successful run
      taskHashHistoryRef.current = [...taskHashHistoryRef.current.slice(-9), hashTask(taskText)]
    } catch (err: any) {
      if (err.name !== "AbortError") setError(err.message || "Council failed")
    } finally {
      setRunning(false)
    }

    function handleEvent(evt: CouncilEvent) {
      if (evt.event === "phase") {
        setPhase(evt.phase)
      } else if (evt.event === "status") {
        setAgentStatus(evt.agentId, { status: evt.status })
      } else if (evt.event === "message") {
        addFeed({ agentId: evt.agentId, type: "message", content: evt.content })
      } else if (evt.event === "file-op") {
        addFeed({ agentId: evt.agentId, type: "file-op", content: "", op: evt.op, filename: evt.filename })
      } else if (evt.event === "vote") {
        setAgentStatus(evt.agentId, { score: evt.score, reasoning: evt.reasoning })
        addFeed({ agentId: evt.agentId, type: "vote", content: evt.reasoning, score: evt.score, reasoning: evt.reasoning })
      } else if (evt.event === "lesson") {
        setLesson(evt.content)
        addFeed({ agentId: "planner", type: "lesson", content: evt.content })
      } else if (evt.event === "loop-detected") {
        setLoopDetected(true)
      } else if (evt.event === "complete") {
        setAvgScore(evt.avgScore)
        setPlan(evt.plan)
      } else if (evt.event === "error") {
        setError(evt.message)
      }
    }
  }, [selectedModel, agentModels, setAgentStatus, addFeed])

  useEffect(() => { runCouncilRef.current = runCouncil }, [runCouncil])

  useEffect(() => {
    if (open && task && task !== runningTaskRef.current) {
      runCouncilRef.current(task)
    }
  }, [open, task]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  const scoreColor =
    avgScore === null ? ""
    : avgScore >= 8 ? "text-emerald-400"
    : avgScore >= 6 ? "text-amber-400"
    : "text-red-400"

  const estCost = AGENTS.reduce((sum, a) => sum + estimateAgentCost(agentModels[a.id]), 0)
  const estCostStr = estCost === 0 ? "free" : estCost < 0.001 ? "<$0.001" : `~$${estCost.toFixed(3)}`
  const highestTier = AGENTS.reduce<string>((top, a) => {
    const t = getModel(agentModels[a.id]).tier
    const order = { free: 0, budget: 1, standard: 2, premium: 3 }
    return (order[t as keyof typeof order] ?? 0) > (order[top as keyof typeof order] ?? 0) ? t : top
  }, "free")
  const costColor = TIER_COLORS[highestTier as keyof typeof TIER_COLORS] ?? "text-gray-400"

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={onClose} />

      <div className={cn(
        "fixed bottom-24 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-700 bg-[#161b22] shadow-2xl flex flex-col transition-all",
        collapsed ? "max-h-14" : "max-h-[580px]"
      )}>
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-700 shrink-0">
          <div className="w-6 h-6 rounded-lg bg-emerald-600/80 flex items-center justify-center shrink-0">
            <Users className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-100 flex-1">Agent Council</span>

          {/* Phase pill */}
          {phase !== "idle" && phase !== "done" && (
            <span className={cn("text-[10px] font-medium shrink-0", PHASE_COLORS[phase])}>
              {PHASE_LABELS[phase]}
            </span>
          )}
          {running && <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" />}
          {!running && avgScore !== null && (
            <span className={cn("text-xs font-bold shrink-0", scoreColor)}>avg {avgScore}/10</span>
          )}
          <span className={cn("text-[10px] font-medium shrink-0", costColor)} title="Estimated council run cost">
            {estCostStr}
          </span>

          <button onClick={() => setCollapsed(!collapsed)} className="p-0.5 hover:bg-gray-700 rounded transition-colors">
            <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", collapsed && "rotate-180")} />
          </button>
          <button onClick={onClose} className="p-0.5 hover:bg-gray-700 rounded transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {!collapsed && (
          <>
            {/* Loop detected warning */}
            {loopDetected && (
              <div className="mx-3 mt-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-400">Loop detected — this task was already reviewed recently. Re-run manually if needed.</p>
              </div>
            )}

            {/* Task display */}
            {task ? (
              <div className="px-3 py-2 border-b border-gray-700/50 shrink-0">
                <p className="text-[11px] text-gray-500 truncate">
                  <span className="text-emerald-400 font-medium">@council</span> {task}
                </p>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-6">
                <p className="text-xs text-gray-500 text-center leading-relaxed">
                  Type <span className="text-emerald-400 font-mono">@council &lt;your task&gt;</span><br />
                  in the chat to start a council session.
                </p>
              </div>
            )}

            {task && (
              <>
                {/* Agent row — only show non-reflector agents */}
                <div className="flex items-start justify-around px-3 py-3 border-b border-gray-700/50 shrink-0">
                  {AGENTS.filter((a) => a.id !== "reflector").map((def) => (
                    <AgentCard
                      key={def.id}
                      def={def}
                      status={agentStates[def.id].status}
                      score={agentStates[def.id].score}
                      selectedModel={selectedModel}
                      agentModel={agentModels[def.id]}
                      onModelChange={(m) => setAgentModels((prev) => ({ ...prev, [def.id]: m }))}
                    />
                  ))}
                </div>

                {/* Discussion feed */}
                <DiscussionFeed entries={feed} className="flex-1 min-h-0" />

                {/* Lesson badge */}
                {lesson && (
                  <div className="mx-3 mb-2 px-3 py-2 bg-sky-500/10 border border-sky-500/30 rounded-lg flex items-start gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-sky-300 leading-relaxed">{lesson}</p>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="mx-3 mb-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}

                {/* Footer */}
                <div className="px-3 py-2.5 border-t border-gray-700/50 shrink-0">
                  {plan && !running && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onApprove(plan)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Go ahead
                      </button>
                      <button
                        onClick={onClose}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-semibold rounded-xl transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </div>
                  )}

                  {!running && task && (
                    <button
                      onClick={() => runCouncil(task)}
                      title="Re-run council"
                      className={cn("p-2 hover:bg-gray-700 rounded-xl transition-colors shrink-0 mt-1", plan ? "ml-auto block" : "ml-auto block")}
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  )}
                  {running && (
                    <button
                      onClick={() => abortRef.current?.abort()}
                      className="ml-auto flex items-center gap-1 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      Stop
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}
