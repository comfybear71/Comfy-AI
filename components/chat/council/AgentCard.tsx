"use client"

import React from "react"
import { Lightbulb, Code2, Eye, ShieldCheck, Zap, Loader2, CheckCircle, AlertTriangle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AgentDef } from "@/lib/agents"
import type { AgentStatus } from "@/lib/council-types"
import { MODELS } from "@/lib/models"

const ICONS = { Lightbulb, Code2, Eye, ShieldCheck, Zap }

const STATUS_LABELS: Record<AgentStatus, string> = {
  idle: "Idle",
  thinking: "Thinking…",
  reviewing: "Reviewing…",
  approved: "Approved",
  "needs-discussion": "Flag",
}

interface AgentCardProps {
  def: AgentDef
  status: AgentStatus
  score?: number
  selectedModel: string
  agentModel: string
  onModelChange: (model: string) => void
}

export function AgentCard({ def, status, score, selectedModel, agentModel, onModelChange }: AgentCardProps) {
  const Icon = ICONS[def.icon]
  const isSpinning = status === "thinking" || status === "reviewing"
  const [pickerOpen, setPickerOpen] = React.useState(false)

  const displayModel = agentModel === selectedModel ? "session" : MODELS.find((m) => m.id === agentModel)?.name ?? agentModel

  return (
    <div className="flex flex-col items-center gap-1 relative">
      {/* Avatar */}
      <button
        onClick={() => setPickerOpen(!pickerOpen)}
        title={`${def.name} — model: ${displayModel}\nClick to change model`}
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ring-2 ring-offset-1 ring-offset-[#161b22]",
          def.bg,
          status === "approved" && "ring-emerald-400",
          status === "needs-discussion" && "ring-red-400",
          status === "thinking" || status === "reviewing" ? "ring-white/40 animate-pulse" : "",
          status === "idle" && "ring-transparent opacity-60",
        )}
      >
        {isSpinning
          ? <Loader2 className="w-4 h-4 text-white animate-spin" />
          : <Icon className="w-4 h-4 text-white" />
        }
      </button>

      {/* Status indicator */}
      <div className="flex flex-col items-center gap-0.5">
        <span className={cn("text-[9px] font-semibold uppercase tracking-wide", def.text)}>
          {def.name}
        </span>
        {status === "approved" && score !== undefined && (
          <span className="text-[9px] text-emerald-400 font-bold">{score}/10</span>
        )}
        {status === "needs-discussion" && score !== undefined && (
          <span className="text-[9px] text-red-400 font-bold">{score}/10</span>
        )}
        {(status === "thinking" || status === "reviewing") && (
          <span className={cn("text-[9px]", def.text)}>{STATUS_LABELS[status]}</span>
        )}
      </div>

      {/* Model picker dropdown */}
      {pickerOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-52 bg-[#0d1117] border border-gray-700 rounded-xl shadow-xl z-20 overflow-hidden">
            <div className="px-2 py-1.5 border-b border-gray-700">
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{def.name} model</p>
            </div>
            <div className="max-h-48 overflow-y-auto py-1">
              <button
                onClick={() => { onModelChange(selectedModel); setPickerOpen(false) }}
                className={cn(
                  "w-full text-left px-3 py-1.5 text-xs hover:bg-gray-700/50 transition-colors",
                  agentModel === selectedModel ? "text-emerald-400" : "text-gray-300"
                )}
              >
                Session model (default)
              </button>
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { onModelChange(m.id); setPickerOpen(false) }}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-xs hover:bg-gray-700/50 transition-colors",
                    agentModel === m.id && agentModel !== selectedModel ? "text-emerald-400" : "text-gray-300"
                  )}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
