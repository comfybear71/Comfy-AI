"use client"

import React, { useEffect, useState, useCallback } from "react"
import { Clock, Trash2, Plus, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ConversationSummary {
  id: string
  title: string | null
  repoOwner: string | null
  repoName: string | null
  createdAt: string
  updatedAt: string
}

interface ConversationDetail extends ConversationSummary {
  messages: { role: string; content: string; metadata: any; createdAt: string }[]
}

interface HistoryButtonProps {
  userId: string
  currentConversationId: string | null
  onLoad: (conv: ConversationDetail) => void
  onNewChat: () => void
}

export function HistoryButton({ userId, currentConversationId, onLoad, onNewChat }: HistoryButtonProps) {
  const [open, setOpen] = useState(false)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/conversations?userId=${encodeURIComponent(userId)}`)
      if (res.ok) {
        const data = await res.json()
        setConversations(Array.isArray(data) ? data : [])
      }
    } catch (e) {
      console.error("Failed to load conversations:", e)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (open) refresh()
  }, [open, refresh])

  const handleSelect = async (id: string) => {
    try {
      const res = await fetch(`/api/conversations?conversationId=${id}`)
      if (!res.ok) return
      const conv = await res.json()
      if (conv) {
        onLoad(conv)
        setOpen(false)
      }
    } catch (e) {
      console.error("Failed to load conversation:", e)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await fetch(`/api/conversations?conversationId=${id}`, { method: "DELETE" })
      setConversations((prev) => prev.filter((c) => c.id !== id))
    } catch (e) {
      console.error("Failed to delete:", e)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors shrink-0"
        title="Conversation history"
        aria-label="History"
      >
        <Clock className="w-4 h-4 text-gray-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed right-3 top-[49px] w-80 max-w-[calc(100vw-1.5rem)] bg-[#161b22] rounded-xl border border-gray-700 shadow-xl z-50 max-h-[480px] flex flex-col">
            <div className="px-3 py-2 border-b border-gray-700 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">History</span>
              <button
                onClick={() => { onNewChat(); setOpen(false) }}
                className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
              >
                <Plus className="w-3.5 h-3.5" />
                New chat
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-6 flex items-center justify-center text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Loading...
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">No conversations yet</div>
              ) : (
                conversations.map((conv) => {
                  const isActive = conv.id === currentConversationId
                  return (
                    <button
                      key={conv.id}
                      onClick={() => handleSelect(conv.id)}
                      className={cn(
                        "w-full text-left px-3 py-2.5 hover:bg-gray-700/50 transition-colors group flex items-start gap-2 border-b border-gray-700/30 last:border-0",
                        isActive && "bg-gray-700/40"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-100 truncate">{conv.title || "Untitled"}</div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-500">
                          <span>{new Date(conv.updatedAt).toLocaleDateString()}</span>
                          {conv.repoName && (
                            <>
                              <span>·</span>
                              <span className="truncate">{conv.repoName}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDelete(conv.id, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-500 hover:text-red-400"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
