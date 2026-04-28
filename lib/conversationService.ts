interface Message {
  role: "user" | "assistant"
  content: string
  metadata?: Record<string, any>
}

interface RepoContext {
  repoOwner?: string
  repoName?: string
}

export async function saveConversation(
  userId: string,
  messages: Message[],
  repoContext?: RepoContext,
  conversationId?: string
): Promise<string> {
  const response = await fetch("/api/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, messages, repoContext, conversationId }),
  })
  if (!response.ok) throw new Error("Failed to save conversation")
  const result = await response.json()
  return result.conversationId
}

export async function getConversation(conversationId: string) {
  const response = await fetch(`/api/conversations?conversationId=${conversationId}`)
  if (!response.ok) throw new Error("Failed to fetch conversation")
  return await response.json()
}

export async function getUserConversations(userId: string) {
  const response = await fetch(`/api/conversations?userId=${userId}`)
  if (!response.ok) throw new Error("Failed to fetch user conversations")
  return await response.json()
}
