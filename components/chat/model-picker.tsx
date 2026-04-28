"use client"

import React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { MODELS, PROVIDER_LABELS, getModel, type Provider } from "@/lib/models"

interface ModelPickerProps {
  selectedModel: string
  onChange: (modelId: string) => void
}

const PROVIDERS: Provider[] = ["groq", "ollama-cloud", "anthropic", "xai", "ollama"]

export function ModelPicker({ selectedModel, onChange }: ModelPickerProps) {
  const [open, setOpen] = React.useState(false)
  const selected = getModel(selectedModel)
  const SelectedIcon = selected.icon

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#21262d] border border-gray-700 hover:bg-gray-700 transition-colors text-sm shrink-0"
      >
        <SelectedIcon className="w-4 h-4 text-emerald-400" />
        <span className="text-gray-100 hidden sm:inline">{selected.name}</span>
        <span className="text-[10px] text-gray-500 bg-gray-700 px-1.5 py-0.5 rounded">
          {{ ollama: "local", anthropic: "claude", xai: "grok", groq: "groq", "ollama-cloud": "cloud" }[selected.provider]}
        </span>
        <ChevronDown className={cn("w-3.5 h-3.5 text-gray-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-72 bg-[#161b22] rounded-xl border border-gray-700 shadow-xl py-1 z-50 max-h-[420px] overflow-y-auto scrollbar-thin">
            {PROVIDERS.map((provider) => {
              const group = MODELS.filter((m) => m.provider === provider)
              return (
                <div key={provider}>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-500 border-b border-gray-700/50">
                    {PROVIDER_LABELS[provider]}
                  </div>
                  {group.map((model) => {
                    const Icon = model.icon
                    const isSelected = selectedModel === model.id
                    return (
                      <button
                        key={model.id}
                        onClick={() => { onChange(model.id); setOpen(false) }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-700/50 transition-colors",
                          isSelected && "bg-gray-700/70"
                        )}
                      >
                        <Icon className={cn("w-4 h-4 shrink-0", isSelected ? "text-emerald-400" : "text-gray-400")} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-gray-100">{model.name}</span>
                            {model.vision && (
                              <span className="text-[9px] px-1 py-0.5 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30">
                                vision
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">{model.description}</div>
                        </div>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
