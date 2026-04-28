"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { MessageProps } from "@/components/chat/message"

const USER_ID = "default" // matches DEFAULT_USER_ID in user/prefs

interface UseConversationPersistenceOpts {
  messages: MessageProps[]
  isLoading: boolean
  selectedRepo?: { owner: { login: string }; name: string } | null
}

/**
 * Auto-saves the current conversation to /api/conversations whenever
 * messages change and we are NOT mid-stream (isLoading=false).
 * Returns the current conversationId and a setter to switch / reset it.
 */
export function useConversationPersistence({
  messages,
  isLoading,
  selectedRepo,
}: UseConversationPersistenceOpts) {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const lastSavedCountRef = useRef(0)
  const savingRef = useRef(false)

  // Reset save tracking when conversation switches
  useEffect(() => {
    lastSavedCountRef.current = messages.length
  }, [conversationId])

  useEffect(() => {
    if (isLoading) return // wait until streaming finishes
    if (messages.length === 0) return
    if (messages.length === lastSavedCountRef.current) return
    if (savingRef.current) return

    // Only save user/assistant pairs — skip if last message is empty assistant placeholder
    const last = messages[messages.length - 1]
    if (last.role === "assistant" && !last.content.trim()) return

    const newMessages = messages.slice(lastSavedCountRef.current).map((m) => ({
      role: m.role,
      content: m.content,
      metadata: m.images && m.images.length > 0 ? { hasImages: true } : {},
    }))

    if (newMessages.length === 0) return

    savingRef.current = true
    fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: USER_ID,
        conversationId,
        messages: newMessages,
        repoContext: selectedRepo
          ? { repoOwner: selectedRepo.owner.login, repoName: selectedRepo.name }
          : undefined,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.conversationId && !conversationId) {
          setConversationId(data.conversationId)
        }
        lastSavedCountRef.current = messages.length
      })
      .catch((err) => console.error("Failed to save conversation:", err))
      .finally(() => {
        savingRef.current = false
      })
  }, [messages, isLoading, conversationId, selectedRepo])

  const startNewConversation = useCallback(() => {
    setConversationId(null)
    lastSavedCountRef.current = 0
  }, [])

  const loadConversation = useCallback((id: string) => {
    setConversationId(id)
    lastSavedCountRef.current = 0 // will be reset by effect above
  }, [])

  return { conversationId, startNewConversation, loadConversation, setConversationId }
}
