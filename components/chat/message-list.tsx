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
    <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-4">
      {messages.map((message) => (
        <Message key={message.id} {...message} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
