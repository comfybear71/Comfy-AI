// Client-side service for conversation persistence

export interface PersistedMessage {
  role: "user" | "assistant" | "system"
  content: string
  metadata?: Record<string, any>
}

export interface RepoContext {
  repoOwner?: string
  repoName?: string
}

export interface ConversationSummary {
  id: string
  title: string | null
  repoOwner: string | null
  repoName: string | null
  createdAt: string
  updatedAt: string
  messages?: { role: string; content: string; createdAt: string }[]
}

/**
 * Save (or update) a conversation. If conversationId is provided, messages
 * are appended to the existing conversation. Otherwise a new conversation is
 * created and the new id is returned.
 */
export async function saveConversation(
  userId: string,
  messages: PersistedMessage[],
  repoContext?: RepoContext,
  conversationId?: string,
): Promise<string> {
  const res = await fetch("/api/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, messages, repoContext, conversationId }),
  })
  if (!res.ok) throw new Error("Failed to save conversation")
  const data = await res.json()
  return data.conversationId
}

export async function getConversation(conversationId: string): Promise<ConversationSummary | null> {
  const res = await fetch(`/api/conversations?conversationId=${conversationId}`)
  if (!res.ok) throw new Error("Failed to fetch conversation")
  return res.json()
}

export async function getUserConversations(userId: string): Promise<ConversationSummary[]> {
  const res = await fetch(`/api/conversations?userId=${encodeURIComponent(userId)}`)
  if (!res.ok) throw new Error("Failed to fetch conversations")
  return res.json()
}
