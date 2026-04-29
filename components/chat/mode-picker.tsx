"use client"

import React, { useState } from "react"
import { Zap, Sparkles, Users, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { MODES, type AppMode } from "@/lib/modes"
import { ModelPicker } from "./model-picker"

const MODE_ICONS = {
  free:   <Zap className="w-3.5 h-3.5" />,
  fast:   <Zap className="w-3.5 h-3.5" />,
  expert: <Sparkles className="w-3.5 h-3.5" />,
  heavy:  <Users className="w-3.5 h-3.5" />,
}

const MODE_COLORS: Record<AppMode, { active: string; dot: string }> = {
  free:   { active: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40", dot: "bg-emerald-400" },
  fast:   { active: "bg-sky-500/20 text-sky-300 border-sky-500/40",             dot: "bg-sky-400"     },
  expert: { active: "bg-amber-500/20 text-amber-300 border-amber-500/40",       dot: "bg-amber-400"   },
  heavy:  { active: "bg-purple-500/20 text-purple-300 border-purple-500/40",    dot: "bg-purple-400"  },
}

interface ModePickerProps {
  mode: AppMode
  selectedModel: string
  onModeChange: (mode: AppMode) => void
  onModelChange: (model: string) => void
}

export function ModePicker({ mode, selectedModel, onModeChange, onModelChange }: ModePickerProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const colors = MODE_COLORS[mode]

  return (
    <div className="flex items-center gap-2">
      {/* Mode pill */}
      <div className="flex items-center bg-[#21262d] border border-gray-700 rounded-xl overflow-hidden">
        {MODES.map((m) => {
          const isActive = mode === m.id
          const c = MODE_COLORS[m.id]
          return (
            <button
              key={m.id}
              onClick={() => onModeChange(m.id)}
              title={m.sublabel}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all",
                isActive
                  ? cn("border", c.active)
                  : "text-gray-500 hover:text-gray-300"
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", isActive ? c.dot : "bg-gray-600")} />
              {m.label}
            </button>
          )
        })}
      </div>

      {/* Advanced model picker toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        title="Advanced model selection"
        className={cn(
          "flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[10px] font-medium transition-colors shrink-0",
          showAdvanced
            ? "bg-gray-700 border-gray-600 text-gray-300"
            : "bg-[#21262d] border-gray-700 text-gray-500 hover:text-gray-300"
        )}
      >
        Advanced
        <ChevronDown className={cn("w-3 h-3 transition-transform", showAdvanced && "rotate-180")} />
      </button>

      {/* Advanced picker — shown inline below when open */}
      {showAdvanced && (
        <div className="absolute top-full mt-1 left-0 right-0 px-4 py-2 bg-[#0d1117] border-t border-gray-700 z-30 flex items-center gap-2">
          <span className="text-xs text-gray-500 shrink-0">Override model:</span>
          <ModelPicker selectedModel={selectedModel} onChange={onModelChange} />
        </div>
      )}
    </div>
  )
}
