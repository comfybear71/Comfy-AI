"use client"

import React from "react"
import { Lightbulb, Code2, Eye, ShieldCheck, Zap, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AgentDef } from "@/lib/agents"
import type { AgentStatus } from "@/lib/council-types"
import { MODELS, TIER_DOT, TIER_LABELS, getModel } from "@/lib/models"

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

  const currentModel = getModel(agentModel)
  const isDefault = agentModel === def.defaultModel
  const displayModel = isDefault ? "smart default" : currentModel.name

  return (
    <div className="flex flex-col items-center gap-1 relative">
      {/* Avatar */}
      <button
        onClick={() => setPickerOpen(!pickerOpen)}
        title={`${def.name} — ${currentModel.name}\nClick to change model`}
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
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 bg-[#0d1117] border border-gray-700 rounded-xl shadow-xl z-20 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-700">
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{def.name} model</p>
              <p className="text-[10px] text-gray-600 mt-0.5">Current: {currentModel.name}</p>
            </div>
            <div className="max-h-52 overflow-y-auto py-1">
              {/* Smart default option */}
              <button
                onClick={() => { onModelChange(def.defaultModel); setPickerOpen(false) }}
                className={cn(
                  "w-full text-left px-3 py-1.5 text-xs hover:bg-gray-700/50 transition-colors flex items-center gap-2",
                  isDefault ? "text-emerald-400" : "text-gray-300"
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", TIER_DOT[getModel(def.defaultModel).tier])} />
                <span className="flex-1">Smart default</span>
                <span className="text-[10px] text-gray-500">{getModel(def.defaultModel).name}</span>
              </button>
              <div className="border-t border-gray-800 my-1" />
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { onModelChange(m.id); setPickerOpen(false) }}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-xs hover:bg-gray-700/50 transition-colors flex items-center gap-2",
                    agentModel === m.id && !isDefault ? "text-emerald-400" : "text-gray-300"
                  )}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", TIER_DOT[m.tier])} />
                  <span className="flex-1">{m.name}</span>
                  <span className="text-[10px] text-gray-500">
                    {m.inputPer1M ? `$${m.inputPer1M}` : "free"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
