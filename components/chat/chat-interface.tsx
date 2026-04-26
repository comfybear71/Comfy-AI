"use client"

import React, { useState, useCallback, useRef } from "react"
import { Sidebar } from "@/components/sidebar"
import { MessageList } from "./message-list"
import { ChatInput } from "./chat-input"
import { MessageProps } from "./message"
import { Sparkles, ArrowRight, ChevronDown, Zap, Code, Brain } from "lucide-react"
import { cn } from "@/lib/utils"

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

const MODELS = [
  {
    id: "llama3.1:8b",
    name: "Llama 3.1 8B",
    description: "General purpose",
    icon: Brain,
  },
  {
    id: "codellama:7b",
    name: "CodeLlama 7B",
    description: "Code generation",
    icon: Code,
  },
  {
    id: "llama3.2:3b",
    name: "Llama 3.2 3B",
    description: "Fast & light",
    icon: Zap,
  },
]

export function ChatInterface() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeChat, setActiveChat] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageProps[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id)
  const [modelMenuOpen, setModelMenuOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const handleNewChat = useCallback(() => {
    setActiveChat(null)
    setMessages([])
    setSidebarOpen(false)
    abortRef.current?.abort()
  }, [])

  const handleSelectChat = useCallback((id: string) => {
    setActiveChat(id)
    setMessages([])
    setSidebarOpen(false)
  }, [])

  const handleSend = useCallback(
    async (content: string) => {
      const userMessage: MessageProps = {
        id: Date.now().toString(),
        role: "user",
        content,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }

      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)

      const assistantId = (Date.now() + 1).toString()
      const assistantMessage: MessageProps = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
      setMessages((prev) => [...prev, assistantMessage])

      try {
        const abort = new AbortController()
        abortRef.current = abort

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abort.signal,
          body: JSON.stringify({
            model: selectedModel,
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            stream: true,
          }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || `HTTP ${res.status}`)
        }

        const reader = res.body?.getReader()
        if (!reader) throw new Error("No response body")

        const decoder = new TextDecoder()
        let fullContent = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          fullContent += chunk

          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: fullContent } : m))
          )
        }
      } catch (err: any) {
        if (err.name === "AbortError") return
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `**Error:** ${err.message || "Failed to reach the LLM."}` }
              : m
          )
        )
      } finally {
        setIsLoading(false)
        abortRef.current = null
      }
    },
    [messages, selectedModel]
  )

  const handleSuggestion = useCallback(
    (suggestion: string) => {
      handleSend(suggestion)
    },
    [handleSend]
  )

  const selectedModelInfo = MODELS.find((m) => m.id === selectedModel) || MODELS[0]
  const SelectedIcon = selectedModelInfo.icon

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
        {/* Header */}
        <div className="border-b border-cream-200 bg-white px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-claude-orange flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm text-claude-dark">Comfy AI</span>
          </div>

          {/* Model Selector */}
          <div className="relative">
            <button
              onClick={() => setModelMenuOpen(!modelMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cream-50 border border-cream-200 hover:bg-cream-100 transition-colors text-sm"
            >
              <SelectedIcon className="w-4 h-4 text-claude-orange" />
              <span className="text-claude-dark">{selectedModelInfo.name}</span>
              <ChevronDown className={cn("w-3.5 h-3.5 text-claude-gray transition-transform", modelMenuOpen && "rotate-180")} />
            </button>

            {modelMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setModelMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl border border-cream-200 shadow-lg py-1 z-50">
                  {MODELS.map((model) => {
                    const Icon = model.icon
                    return (
                      <button
                        key={model.id}
                        onClick={() => {
                          setSelectedModel(model.id)
                          setModelMenuOpen(false)
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-cream-50 transition-colors",
                          selectedModel === model.id && "bg-cream-50"
                        )}
                      >
                        <Icon className={cn("w-4 h-4 shrink-0", selectedModel === model.id ? "text-claude-orange" : "text-claude-gray")} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-claude-dark">{model.name}</div>
                          <div className="text-xs text-claude-gray">{model.description}</div>
                        </div>
                        {selectedModel === model.id && (
                          <div className="w-1.5 h-1.5 rounded-full bg-claude-orange" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>

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
