"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { Users, X, ChevronDown, CheckCircle, XCircle, Loader2, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { AgentCard } from "./AgentCard"
import { DiscussionFeed } from "./DiscussionFeed"
import { AGENTS } from "@/lib/agents"
import type { AgentId, AgentModels, AgentState, CouncilEvent, FeedEntry } from "@/lib/council-types"

const DEFAULT_AGENT_STATES = (): Record<AgentId, AgentState> => ({
  planner:  { status: "idle" },
  coder:    { status: "idle" },
  reviewer: { status: "idle" },
  security: { status: "idle" },
  perf:     { status: "idle" },
})

interface CouncilPanelProps {
  task: string
  selectedModel: string
  open: boolean
  onClose: () => void
  onApprove: (plan: string) => void
}

export function CouncilPanel({ task, selectedModel, open, onClose, onApprove }: CouncilPanelProps) {
  const [agentModels, setAgentModels] = useState<AgentModels>(() =>
    Object.fromEntries(AGENTS.map((a) => [a.id, selectedModel])) as AgentModels
  )
  const [agentStates, setAgentStates] = useState<Record<AgentId, AgentState>>(DEFAULT_AGENT_STATES)
  const [feed, setFeed] = useState<FeedEntry[]>([])
  const [running, setRunning] = useState(false)
  const [avgScore, setAvgScore] = useState<number | null>(null)
  const [plan, setPlan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const runningTaskRef = useRef<string>("")

  const setAgentStatus = useCallback((agentId: AgentId, patch: Partial<AgentState>) => {
    setAgentStates((prev) => ({ ...prev, [agentId]: { ...prev[agentId], ...patch } }))
  }, [])

  const addFeed = useCallback((entry: Omit<FeedEntry, "id">) => {
    setFeed((prev) => [...prev, { ...entry, id: `${Date.now()}-${Math.random()}` }])
  }, [])

  const runCouncil = useCallback(async (taskText: string) => {
    if (abortRef.current) abortRef.current.abort()
    const abort = new AbortController()
    abortRef.current = abort
    runningTaskRef.current = taskText

    setRunning(true)
    setAvgScore(null)
    setPlan(null)
    setError(null)
    setFeed([])
    setAgentStates(DEFAULT_AGENT_STATES())

    try {
      const res = await fetch("/api/agents/council", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abort.signal,
        body: JSON.stringify({ task: taskText, selectedModel, agentModels }),
      })

      if (!res.ok || !res.body) {
        setError(`Council API error: HTTP ${res.status}`)
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
    } catch (err: any) {
      if (err.name !== "AbortError") setError(err.message || "Council failed")
    } finally {
      setRunning(false)
    }

    function handleEvent(evt: CouncilEvent) {
      if (evt.event === "status") {
        setAgentStatus(evt.agentId, { status: evt.status })
      } else if (evt.event === "message") {
        addFeed({ agentId: evt.agentId, type: "message", content: evt.content })
      } else if (evt.event === "file-op") {
        addFeed({ agentId: evt.agentId, type: "file-op", content: "", op: evt.op, filename: evt.filename })
      } else if (evt.event === "vote") {
        setAgentStatus(evt.agentId, { score: evt.score, reasoning: evt.reasoning })
        addFeed({ agentId: evt.agentId, type: "vote", content: evt.reasoning, score: evt.score, reasoning: evt.reasoning })
      } else if (evt.event === "complete") {
        setAvgScore(evt.avgScore)
        setPlan(evt.plan)
      } else if (evt.event === "error") {
        setError(evt.message)
      }
    }
  }, [selectedModel, agentModels, setAgentStatus, addFeed])

  // Start council when task changes and panel is open
  useEffect(() => {
    if (open && task && task !== runningTaskRef.current) {
      runCouncil(task)
    }
  }, [open, task, runCouncil])

  // Sync new selectedModel → agents that are still on the session default
  useEffect(() => {
    setAgentModels((prev) => {
      const next = { ...prev }
      for (const a of AGENTS) {
        if (next[a.id] === prev[a.id] && !Object.values(prev).find((m) => m !== selectedModel)) {
          next[a.id] = selectedModel
        }
      }
      return next
    })
  }, [selectedModel])

  if (!open) return null

  const scoreColor =
    avgScore === null ? ""
    : avgScore >= 8 ? "text-emerald-400"
    : avgScore >= 6 ? "text-amber-400"
    : "text-red-400"

  return (
    <>
      {/* Backdrop — mobile only */}
      <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={onClose} />

      {/* Panel */}
      <div className={cn(
        "fixed bottom-24 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-700 bg-[#161b22] shadow-2xl flex flex-col transition-all",
        collapsed ? "max-h-14" : "max-h-[520px]"
      )}>
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-700 shrink-0">
          <div className="w-6 h-6 rounded-lg bg-emerald-600/80 flex items-center justify-center shrink-0">
            <Users className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-100 flex-1">Agent Council</span>

          {running && <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" />}
          {!running && avgScore !== null && (
            <span className={cn("text-xs font-bold shrink-0", scoreColor)}>
              avg {avgScore}/10
            </span>
          )}

          <button onClick={() => setCollapsed(!collapsed)} className="p-0.5 hover:bg-gray-700 rounded transition-colors">
            <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", collapsed && "rotate-180")} />
          </button>
          <button onClick={onClose} className="p-0.5 hover:bg-gray-700 rounded transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {!collapsed && (
          <>
            {/* Task */}
            {task && (
              <div className="px-3 py-2 border-b border-gray-700/50 shrink-0">
                <p className="text-[11px] text-gray-500 truncate">
                  <span className="text-emerald-400 font-medium">@council</span> {task}
                </p>
              </div>
            )}

            {/* Agent row */}
            <div className="flex items-start justify-around px-3 py-3 border-b border-gray-700/50 shrink-0">
              {AGENTS.map((def) => (
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

            {/* Error */}
            {error && (
              <div className="mx-3 mb-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            {/* Footer: approval buttons or re-run */}
            <div className="px-3 py-2.5 border-t border-gray-700/50 shrink-0 flex items-center gap-2">
              {plan && !running && (
                <>
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
                </>
              )}
              {!running && (
                <button
                  onClick={() => runCouncil(task)}
                  title="Re-run council"
                  className={cn(
                    "p-2 hover:bg-gray-700 rounded-xl transition-colors shrink-0",
                    plan ? "" : "ml-auto"
                  )}
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
      </div>
    </>
  )
}
