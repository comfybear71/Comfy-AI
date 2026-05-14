"use client"

import React, { useState } from "react"
import { Zap, Sparkles, Users, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { MODES, type AppMode } from "@/lib/modes"

const MODE_ICONS = {
  free:   <Zap className="w-4 h-4" />,
  fast:   <Zap className="w-4 h-4" />,
  expert: <Sparkles className="w-4 h-4" />,
  heavy:  <Users className="w-4 h-4" />,
}

const MODE_COLORS: Record<AppMode, { dot: string; text: string; icon: string }> = {
  free:   { dot: "bg-emerald-400", text: "text-emerald-400", icon: "text-emerald-400" },
  fast:   { dot: "bg-sky-400",     text: "text-sky-400",     icon: "text-sky-400"     },
  expert: { dot: "bg-amber-400",   text: "text-amber-400",   icon: "text-amber-400"   },
  heavy:  { dot: "bg-purple-400",  text: "text-purple-400",  icon: "text-purple-400"  },
}

interface ModePickerProps {
  mode: AppMode
  onModeChange: (mode: AppMode) => void
}

export function ModePicker({ mode, onModeChange }: ModePickerProps) {
  const [open, setOpen] = useState(false)
  const current = MODES.find((m) => m.id === mode)!
  const colors = MODE_COLORS[mode]

  return (
    <div className="relative">
      {/* Trigger button — sits inside the input row */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all shrink-0",
          "bg-[#21262d] border-gray-700 hover:border-gray-500"
        )}
      >
        <span className={cn("w-2 h-2 rounded-full shrink-0", colors.dot)} />
        <span className={colors.text}>{current.label}</span>
      </button>

      {/* Popup — floats above the input like SuperGrok */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full mb-3 left-0 w-64 bg-[#161b22] border border-gray-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700/60">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Mode</p>
            </div>
            <div className="py-1.5">
              {MODES.map((m) => {
                const c = MODE_COLORS[m.id]
                const isActive = mode === m.id
                return (
                  <button
                    key={m.id}
                    onClick={() => { onModeChange(m.id); setOpen(false) }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                      isActive ? "bg-gray-700/50" : "hover:bg-gray-700/30"
                    )}
                  >
                    <div className={cn("shrink-0", c.icon)}>
                      {MODE_ICONS[m.id]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm font-semibold", isActive ? c.text : "text-gray-200")}>
                          {m.label}
                        </span>
                        {m.councilEnabled && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30 font-medium">
                            council
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{m.sublabel}</p>
                    </div>
                    {isActive && <Check className={cn("w-4 h-4 shrink-0", c.text)} />}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
