"use client"

import React, { useState, useCallback } from "react"
import { Sidebar } from "@/components/sidebar"
import { MessageList } from "./message-list"
import { ChatInput } from "./chat-input"
import { MessageProps } from "./message"
import { Sparkles, ArrowRight } from "lucide-react"

const DEMO_CHATS = [
  { id: "1", title: "React component patterns", date: "Today" },
  { id: "2", title: "Python data analysis", date: "Yesterday" },
  { id: "3", title: "API design discussion", date: "Apr 24" },
]

const WELCOME_SUGGESTIONS = [
  "Explain React Server Components",
  "Write a Python script for data visualization",
  "Help me design a REST API",
  "Debug this TypeScript error",
]

export function ChatInterface() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeChat, setActiveChat] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageProps[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleNewChat = useCallback(() => {
    setActiveChat(null)
    setMessages([])
    setSidebarOpen(false)
  }, [])

  const handleSelectChat = useCallback((id: string) => {
    setActiveChat(id)
    // In a real app, fetch messages for this chat
    setMessages([])
    setSidebarOpen(false)
  }, [])

  const handleSend = useCallback(async (content: string) => {
    const userMessage: MessageProps = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: MessageProps = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: generateResponse(content),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1500)
  }, [])

  const handleSuggestion = useCallback(
    (suggestion: string) => {
      handleSend(suggestion)
    },
    [handleSend]
  )

  return (
    <div className="flex h-screen bg-cream-50">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        chats={DEMO_CHATS}
        activeChat={activeChat}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <div className="text-center max-w-2xl">
              <div className="w-16 h-16 rounded-2xl bg-claude-orange/10 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-8 h-8 text-claude-orange" />
              </div>

              <h1 className="text-3xl font-semibold text-claude-dark mb-3">
                Welcome to Comfy AI
              </h1>
              <p className="text-claude-gray mb-8 text-lg">
                Your comfortable space for coding, creating, and conversing.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl mx-auto">
                {WELCOME_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSuggestion(suggestion)}
                    className="flex items-center justify-between p-4 bg-white rounded-xl border border-cream-200 hover:border-claude-orange/30 hover:shadow-sm transition-all text-left group"
                  >
                    <span className="text-sm text-claude-dark">{suggestion}</span>
                    <ArrowRight className="w-4 h-4 text-claude-gray opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <MessageList messages={messages} isLoading={isLoading} />
        )}

        <ChatInput onSend={handleSend} isLoading={isLoading} />
      </div>
    </div>
  )
}

function generateResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase()

  if (lower.includes("react")) {
    return `## React Server Components

React Server Components (RSC) allow components to render exclusively on the server. This enables:

- **Zero bundle size** for server-only code
- **Direct backend access** without API layers
- **Improved initial page load**

\`\`\`tsx
// Server Component
async function BlogPosts() {
  const posts = await db.posts.findMany();

  return (
    <ul>
      {posts.map(post => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
\`\`\`

Key differences from Client Components:
| Feature | Server | Client |
|---------|--------|--------|
| Render location | Server | Browser |
| Can use hooks | ❌ | ✅ |
| Can use \`useState\` | ❌ | ✅ |
| Access DB directly | ✅ | ❌ |`
  }

  if (lower.includes("python") || lower.includes("data")) {
    return `Here's a Python script for data visualization using matplotlib:

\`\`\`python
import matplotlib.pyplot as plt
import numpy as np

# Generate sample data
x = np.linspace(0, 10, 100)
y = np.sin(x)

# Create the plot
fig, ax = plt.subplots(figsize=(10, 6))
ax.plot(x, y, label='sin(x)', color='#d97757', linewidth=2)
ax.fill_between(x, y, alpha=0.3, color='#d97757')

ax.set_xlabel('X Axis')
ax.set_ylabel('Y Axis')
ax.set_title('Sine Wave Visualization')
ax.legend()
ax.grid(True, alpha=0.3)

plt.tight_layout()
plt.show()
\`\`\`

This creates a beautiful sine wave plot with a warm color scheme matching your UI! 🎨`
  }

  if (lower.includes("api")) {
    return `## REST API Design Principles

When designing a REST API, follow these guidelines:

### 1. Use Nouns, Not Verbs
\`\`\`
GET  /users      ✅
GET  /getUsers   ❌
\`\`\`

### 2. Proper HTTP Status Codes
- \`200\` OK
- \`201\` Created
- \`400\` Bad Request
- \`401\` Unauthorized
- \`404\` Not Found
- \`500\` Server Error

### 3. Versioning
\`\`\`
/api/v1/users
/api/v2/users
\`\`\`

### 4. Pagination
\`\`\`
GET /users?page=1&limit=20
\`\`\`

Would you like me to elaborate on any of these principles?`
  }

  return `I'd be happy to help with that! Here's a general response structure:

1. **Understand the problem** - Break it down into smaller parts
2. **Research solutions** - Look for established patterns
3. **Implement iteratively** - Start with a minimal working version
4. **Refactor and optimize** - Improve code quality

\`\`\`typescript
function solveProblem(input: string): string {
  // Step 1: Validate input
  if (!input) return "No input provided";

  // Step 2: Process
  const result = input
    .split('')
    .reverse()
    .join('');

  // Step 3: Return
  return result;
}
\`\`\`

Let me know if you'd like me to dive deeper into any specific aspect!`
}
