"use client"

import React, { useState } from "react"
import { X, Plus, Trash2, Brain, User, FolderOpen, Lightbulb, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MemoryData, RecentSession } from "@/lib/memory"

interface MemoryPanelProps {
  memory: MemoryData
  onUpdate: (next: MemoryData) => void
  onClose: () => void
}

function Tag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-1 px-2 py-1 bg-[#0a0d12] border border-gray-700 rounded-lg text-xs text-gray-200 group">
      {label}
      <button onClick={onRemove} className="text-gray-600 hover:text-red-400 transition-colors ml-0.5">
        <X className="w-3 h-3" />
      </button>
    </span>
  )
}

function AddField({ placeholder, onAdd }: { placeholder: string; onAdd: (value: string) => void }) {
  const [value, setValue] = useState("")
  const submit = () => {
    const v = value.trim()
    if (!v) return
    onAdd(v)
    setValue("")
  }
  return (
    <div className="flex gap-1.5 mt-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder={placeholder}
        className="flex-1 text-xs bg-[#0a0d12] border border-gray-700 rounded-lg px-2.5 py-1.5 text-gray-200 placeholder:text-gray-600 outline-none focus:border-emerald-500/50"
      />
      <button
        onClick={submit}
        className="px-2.5 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="pb-4 border-b border-gray-700/40 last:border-0">
      <div className="flex items-center gap-2 mb-2.5">
        <Icon className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{title}</span>
      </div>
      {children}
    </div>
  )
}

export function MemoryPanel({ memory, onUpdate, onClose }: MemoryPanelProps) {
  const update = (patch: Partial<MemoryData>) => onUpdate({ ...memory, ...patch })

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-30 lg:hidden" onClick={onClose} />
      <div className="fixed right-0 top-12 bottom-0 lg:relative lg:top-auto lg:bottom-auto w-72 bg-[#0e1117] border-l border-white/[0.06] flex flex-col z-40">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-gray-100">Memory</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">

          {/* Preferred name */}
          <Section icon={User} title="Preferred Name">
            <input
              value={memory.preferredName}
              onChange={(e) => update({ preferredName: e.target.value })}
              className="w-full text-sm bg-[#0a0d12] border border-gray-700 rounded-lg px-3 py-2 text-gray-100 outline-none focus:border-emerald-500/50"
            />
          </Section>

          {/* Known aliases */}
          <Section icon={User} title="Known Names">
            <div className="flex flex-wrap gap-1.5">
              {memory.names.map((name, i) => (
                <Tag
                  key={i}
                  label={name}
                  onRemove={() => update({ names: memory.names.filter((_, j) => j !== i) })}
                />
              ))}
            </div>
            <AddField
              placeholder="Add alias…"
              onAdd={(v) => update({ names: [...memory.names, v] })}
            />
          </Section>

          {/* Active projects */}
          <Section icon={FolderOpen} title="Active Projects">
            {memory.activeProjects.length === 0 && (
              <p className="text-xs text-gray-600 mb-1">No projects tracked yet</p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {memory.activeProjects.map((p, i) => (
                <Tag
                  key={i}
                  label={p}
                  onRemove={() => update({ activeProjects: memory.activeProjects.filter((_, j) => j !== i) })}
                />
              ))}
            </div>
            <AddField
              placeholder="Add project…"
              onAdd={(v) => update({ activeProjects: [...memory.activeProjects, v] })}
            />
          </Section>

          {/* Facts */}
          <Section icon={Lightbulb} title="Learned Facts">
            {memory.facts.length === 0 && (
              <p className="text-xs text-gray-600 mb-1">No facts stored yet</p>
            )}
            <div className="space-y-1.5">
              {memory.facts.map((fact, i) => (
                <div key={i} className="flex items-start gap-2 group">
                  <span className="flex-1 text-xs text-gray-300 bg-[#0a0d12] border border-gray-700 rounded-lg px-2.5 py-1.5 leading-relaxed">
                    {fact}
                  </span>
                  <button
                    onClick={() => update({ facts: memory.facts.filter((_, j) => j !== i) })}
                    className="mt-1.5 text-gray-600 hover:text-red-400 transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <AddField
              placeholder="Add a fact…"
              onAdd={(v) => update({ facts: [...memory.facts, v] })}
            />
          </Section>

          {/* Recent sessions */}
          {(memory.recentSessions ?? []).length > 0 && (
            <Section icon={Clock} title="Recent Sessions">
              <div className="space-y-2">
                {(memory.recentSessions ?? []).map((s: RecentSession, i: number) => (
                  <div key={i} className="flex items-start gap-2 group">
                    <div className="flex-1 bg-[#0a0d12] border border-gray-700 rounded-lg px-2.5 py-2">
                      <p className="text-[10px] text-emerald-400 mb-0.5">
                        {new Date(s.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })} · {s.messageCount} msgs
                      </p>
                      <p className="text-xs text-gray-300 leading-relaxed">{s.summary}</p>
                    </div>
                    <button
                      onClick={() => update({ recentSessions: (memory.recentSessions ?? []).filter((_, j) => j !== i) })}
                      className="mt-2 text-gray-600 hover:text-red-400 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Feedback stats */}
          {(memory.feedbackLog ?? []).length > 0 && (
            <Section icon={Lightbulb} title="Feedback">
              <div className="flex gap-4 text-sm">
                <span className="text-emerald-400">
                  👍 {(memory.feedbackLog ?? []).filter(f => f.vote === "up").length}
                </span>
                <span className="text-red-400">
                  👎 {(memory.feedbackLog ?? []).filter(f => f.vote === "down").length}
                </span>
              </div>
              <button
                onClick={() => update({ feedbackLog: [] })}
                className="mt-2 text-[11px] text-gray-600 hover:text-red-400 transition-colors"
              >
                Clear feedback history
              </button>
            </Section>
          )}
        </div>

        <div className="px-4 py-3 border-t border-white/[0.06]">
          <p className="text-[11px] text-gray-600 text-center">Changes save automatically</p>
        </div>
      </div>
    </>
  )
}
