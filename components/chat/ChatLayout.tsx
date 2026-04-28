'use client'

import { useState } from "react"
import { getConversation } from "@/lib/conversationService"
import HistorySidebar from "./HistorySidebar"

export default function ChatLayout({
  userId,
  children,
}: {
  userId: string
  children: React.ReactNode
}) {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)

  const handleConversationSelect = async (conversationId: string) => {
    try {
      const conversation = await getConversation(conversationId)
      setCurrentConversationId(conversationId)
      // TODO: Dispatch or update state to load messages into chat UI
      console.log("Selected conversation", conversation)
    } catch (error) {
      console.error("Failed to load conversation", error)
    }
  }

  return (
    <div className="relative h-full">
      <header className="border-b dark:border-gray-800 px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Chat</h1>
        <div className="flex items-center gap-2">
          <HistorySidebar 
            userId={userId} 
            onConversationSelect={handleConversationSelect} 
          />
        </div>
      </header>
      
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
