"use client"

import React, { useEffect, useRef } from "react"
import { Lightbulb, Code2, Eye, ShieldCheck, Zap, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { FileOpBadge } from "./FileOpBadge"
import { AGENT_MAP } from "@/lib/agents"
import type { FeedEntry } from "@/lib/council-types"

const ICONS = { Lightbulb, Code2, Eye, ShieldCheck, Zap }

interface DiscussionFeedProps {
  entries: FeedEntry[]
  className?: string
}

export function DiscussionFeed({ entries, className }: DiscussionFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [entries.length])

  if (entries.length === 0) {
    return (
      <div className={cn("flex items-center justify-center py-8 text-gray-600 text-xs", className)}>
        Waiting for agents…
      </div>
    )
  }

  return (
    <div className={cn("space-y-2 overflow-y-auto py-2", className)}>
      {entries.map((entry) => {
        const def = AGENT_MAP[entry.agentId]
        const Icon = ICONS[def.icon]

        if (entry.type === "file-op" && entry.filename && entry.op) {
          return (
            <div key={entry.id} className="flex items-center gap-2 px-3">
              <div className={cn("w-4 h-4 rounded-full flex items-center justify-center shrink-0", def.bg)}>
                <Icon className="w-2.5 h-2.5 text-white" />
              </div>
              <FileOpBadge op={entry.op} filename={entry.filename} />
            </div>
          )
        }

        if (entry.type === "vote") {
          const color = (entry.score ?? 0) >= 7 ? "text-emerald-400" : (entry.score ?? 0) >= 5 ? "text-amber-400" : "text-red-400"
          return (
            <div key={entry.id} className={cn("mx-3 rounded-lg border p-2.5 space-y-1", def.border, "bg-gray-800/30")}>
              <div className="flex items-center gap-2">
                <div className={cn("w-4 h-4 rounded-full flex items-center justify-center shrink-0", def.bg)}>
                  <Icon className="w-2.5 h-2.5 text-white" />
                </div>
                <span className={cn("text-[10px] font-semibold uppercase tracking-wide", def.text)}>{def.name}</span>
                <div className="flex items-center gap-0.5 ml-auto">
                  <Star className={cn("w-3 h-3", color)} />
                  <span className={cn("text-xs font-bold", color)}>{entry.score}/10</span>
                </div>
              </div>
              {entry.reasoning && (
                <p className="text-xs text-gray-400 leading-relaxed pl-6">{entry.reasoning}</p>
              )}
            </div>
          )
        }

        // message
        return (
          <div key={entry.id} className="px-3">
            <div className="flex items-start gap-2">
              <div className={cn("w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5", def.bg)}>
                <Icon className="w-2.5 h-2.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <span className={cn("text-[10px] font-semibold uppercase tracking-wide block mb-0.5", def.text)}>
                  {def.name}
                </span>
                <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                  {entry.content}
                </p>
              </div>
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
