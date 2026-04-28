"use client"

import React from "react"
import { Clock, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Conversation {
  id: string
  title: string
  createdAt: string
  repoName?: string
  messageCount: number
}

interface HistoryPanelProps {
  conversations: Conversation[]
  isLoading: boolean
  onSelectConversation: (id: string) => void
  onDeleteConversation: (id: string) => void
  className?: string
}

export function HistoryPanel({
  conversations,
  isLoading,
  onSelectConversation,
  onDeleteConversation,
  className,
}: HistoryPanelProps) {
  if (isLoading) {
    return (
      <div className={cn("p-4 text-sm text-gray-500", className)}>
        Loading conversations...
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className={cn("p-4 text-sm text-gray-500", className)}>
        No conversation history yet
      </div>
    )
  }

  return (
    <div className={cn("w-80 bg-background border rounded-lg shadow-lg", className)}>
      <div className="p-3 border-b bg-muted/50">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Chat History
        </h3>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className="p-3 border-b hover:bg-accent cursor-pointer group"
            onClick={() => onSelectConversation(conversation.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {conversation.title}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>
                    {new Date(conversation.createdAt).toLocaleDateString()}
                  </span>
                  {conversation.repoName && (
                    <>
                      <span>•</span>
                      <span className="truncate">{conversation.repoName}</span>
                    </>
                  )}
                  <span>•</span>
                  <span>{conversation.messageCount} messages</span>
                </div>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteConversation(conversation.id)
                }}
                className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive hover:text-destructive-foreground rounded"
                title="Delete conversation"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}