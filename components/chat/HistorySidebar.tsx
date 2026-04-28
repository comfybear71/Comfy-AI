'use client'

import { useState, useEffect } from "react"
import { History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getUserConversations } from "@/lib/conversationService"

export default function HistorySidebar({
  userId,
  onConversationSelect,
}: {
  userId: string
  onConversationSelect: (conversationId: string) => void
}) {
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (isOpen && userId) {
      fetchConversations()
    }
  }, [isOpen, userId])

  const fetchConversations = async () => {
    setLoading(true)
    try {
      const data = await getUserConversations(userId)
      setConversations(data)
    } catch (error) {
      console.error("Failed to fetch conversations", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => setIsOpen(!isOpen)}
        title="Conversation History"
      >
        <History className="h-5 w-5" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setIsOpen(false)}>
          <div 
            className="fixed top-0 left-0 h-full w-80 bg-white dark:bg-gray-900 shadow-lg p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <History className="h-5 w-5" />
              Conversation History
            </h2>

            {loading ? (
              <div className="text-center py-4">Loading conversations...</div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                No conversations found
              </div>
            ) : (
              <div className="space-y-4 overflow-y-auto h-[calc(100vh-100px)]">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    className="w-full text-left p-3 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => {
                      onConversationSelect(conv.id)
                      setIsOpen(false)
                    }}
                  >
                    <div className="font-medium truncate">{conv.title || "Untitled Conversation"}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {conv.repoOwner && conv.repoName 
                        ? `${conv.repoOwner}/${conv.repoName}` 
                        : "No repository context"}
                    </div>
                    {conv.messages && conv.messages.length > 0 && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
                        {conv.messages[0].content.slice(0, 50)}...
                      </div>
                    )}
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {new Date(conv.updatedAt).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
