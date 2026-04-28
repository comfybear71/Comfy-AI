"use client"

import { useState, useEffect, useRef } from "react"
import { Clock, MessageSquare, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface ConversationListItem {
  id: string
  created_at: string
  updated_at: string
  preview: string | null
  message_count: number
}

interface HistoryPanelProps {
  userId: string
  currentConversationId: string | null
  onSelectConversation: (id: string) => void
  onNewConversation: () => void
}

export function HistoryPanel({
  userId,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
}: HistoryPanelProps) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<ConversationListItem[]>([])
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [open])

  // Load list when opened
  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch(`/api/conversations?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setItems(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, userId, currentConversationId])

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffH = diffMs / (1000 * 60 * 60)
    if (diffH < 24) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    if (diffH < 24 * 7) return d.toLocaleDateString([], { weekday: "short" })
    return d.toLocaleDateString([], { month: "short", day: "numeric" })
  }

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-gray-400 hover:text-gray-100"
        title="Conversation history"
        onClick={() => setOpen((v) => !v)}
      >
        <Clock className="w-5 h-5" />
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-[#161b22] border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-700 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-200">History</span>
            <button
              className="text-xs text-emerald-400 hover:text-emerald-300"
              onClick={() => {
                onNewConversation()
                setOpen(false)
              }}
            >
              + New chat
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm">Loading…</span>
              </div>
            )}

            {!loading && items.length === 0 && (
              <div className="py-8 text-center text-sm text-gray-500">
                No conversations yet
              </div>
            )}

            {!loading &&
              items.map((it) => (
                <button
                  key={it.id}
                  onClick={() => {
                    onSelectConversation(it.id)
                    setOpen(false)
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 hover:bg-[#1f2937] border-b border-gray-800 last:border-b-0 transition-colors flex gap-2",
                    it.id === currentConversationId && "bg-[#1f2937]"
                  )}
                >
                  <MessageSquare className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-100 truncate">
                      {it.preview || "New conversation"}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDate(it.updated_at)} · {it.message_count} msgs
                    </p>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
