"use client"

import React, { useRef, useEffect } from "react"
import { Message, MessageProps } from "./message"

interface MessageListProps {
  messages: MessageProps[]
  isLoading?: boolean
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  if (messages.length === 0) {
    return null
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      {messages.map((message) => (
        <Message key={message.id} {...message} />
      ))}

      {isLoading && (
        <div className="py-6 bg-cream-50">
          <div className="max-w-3xl mx-auto px-4 flex gap-4">
            <div className="shrink-0">
              <div className="w-7 h-7 rounded-full bg-claude-orange flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white animate-pulse"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-sm">Comfy AI</span>
              </div>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-claude-gray/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-claude-gray/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-claude-gray/40 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
