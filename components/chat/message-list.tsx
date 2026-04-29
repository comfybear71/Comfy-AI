"use client"

import React, { useRef, useEffect } from "react"
import { Message, MessageProps } from "./message"

interface MessageListProps {
  messages: MessageProps[]
  isLoading?: boolean
  suggestions?: Record<string, string[]>
  onSuggest?: (text: string) => void
}

export function MessageList({ messages, isLoading, suggestions = {}, onSuggest }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  if (messages.length === 0) return null

  // Only the last non-streaming AI message gets suggestion chips
  const lastAIId = [...messages]
    .reverse()
    .find((m) => m.role === "assistant" && !m.isStreaming)?.id

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2">
      {messages.map((message) => (
        <Message
          key={message.id}
          {...message}
          suggestions={message.id === lastAIId ? suggestions[message.id] : undefined}
          onSuggest={onSuggest}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
