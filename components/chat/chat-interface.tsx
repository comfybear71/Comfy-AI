"use client"

import React, { useState, useCallback, useRef, useEffect } from "react"
import { Sidebar, GitHubRepoItem } from "@/components/sidebar"
import { MessageList } from "./message-list"
import { ChatInput } from "./chat-input"
import { MessageProps } from "./message"
import { FileViewer } from "@/components/file-viewer"
import { PRModal } from "@/components/pr-modal"
import { PRStatusBanner } from "@/components/pr-status-banner"
import {
  Sparkles,
  ArrowRight,
  ChevronDown,
  Zap,
  Code,
  Brain,
  Github,
  FolderOpen,
  FileCode,
  ChevronRight,
  GitPullRequest,
  X,
  Loader2,
} from "lucide-react"
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

interface GitHubFileItem {
  name: string
  path: string
  type: "file" | "dir"
  sha: string
}

export function ChatInterface() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeChat, setActiveChat] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageProps[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id)
  const [modelMenuOpen, setModelMenuOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // GitHub state
  const [githubConnected, setGithubConnected] = useState(false)
  const [repos, setRepos] = useState<GitHubRepoItem[]>([])
  const [reposLoading, setReposLoading] = useState(false)
  const [reposError, setReposError] = useState<string | null>(null)
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepoItem | null>(null)
  const [repoFiles, setRepoFiles] = useState<GitHubFileItem[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [filePath, setFilePath] = useState<string[]>([])
  const [viewerFile, setViewerFile] = useState<{
    name: string
    path: string
    content: string
    html_url: string
  } | null>(null)
  const [prModalOpen, setPrModalOpen] = useState(false)
  const [activePR, setActivePR] = useState<{
    owner: string
    repo: string
    number: number
    url: string
  } | null>(null)
  const [repoPanelOpen, setRepoPanelOpen] = useState(false)
  const [pinnedRepos, setPinnedRepos] = useState<string[]>([])
  const [repoSearch, setRepoSearch] = useState("")

  // Load prefs from Neon on mount
  useEffect(() => {
    fetch("/api/user/prefs")
      .then((res) => res.json())
      .then((data) => {
        if (data.pinnedRepos) setPinnedRepos(data.pinnedRepos)
      })
      .catch(() => {})
  }, [])

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

  const handleTogglePin = useCallback((repoId: number) => {
    const id = String(repoId)
    setPinnedRepos((prev) => {
      const next = prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
      // Save to Neon
      fetch("/api/user/prefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinnedRepos: next }),
      }).catch(() => {})
      return next
    })
  }, [])

  const handleConnectGitHub = useCallback(async () => {
    setReposLoading(true)
    setReposError(null)
    try {
      const res = await fetch("/api/github/repos")
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to connect")
      }
      setRepos(data)
      setGithubConnected(true)
    } catch (err: any) {
      setReposError(err.message)
    } finally {
      setReposLoading(false)
    }
  }, [])

  const handleSelectRepo = useCallback(async (repo: GitHubRepoItem) => {
    setSelectedRepo(repo)
    setFilePath([])
    setRepoPanelOpen(true)
    setSidebarOpen(false)

    setFilesLoading(true)
    try {
      const res = await fetch(
        `/api/github/repo/${repo.owner.login}/${repo.name}/files`
      )
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to load files")
      }
      setRepoFiles(data)
    } catch (err: any) {
      console.error("Failed to load repo files:", err)
    } finally {
      setFilesLoading(false)
    }
  }, [])

  const handleOpenFile = useCallback(
    async (filePath: string[]) => {
      if (!selectedRepo) return
      try {
        const path = filePath.join("/")
        const res = await fetch(
          `/api/github/repo/${selectedRepo.owner.login}/${selectedRepo.name}/files/${path}`
        )
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || "Failed to load file")
        }
        setViewerFile(data)
      } catch (err: any) {
        console.error("Failed to load file:", err)
      }
    },
    [selectedRepo]
  )

  const handleOpenDirectory = useCallback(
    async (dirPath: string[]) => {
      if (!selectedRepo) return
      setFilesLoading(true)
      try {
        const path = dirPath.join("/")
        const res = await fetch(
          `/api/github/repo/${selectedRepo.owner.login}/${selectedRepo.name}/files?path=${encodeURIComponent(path)}`
        )
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || "Failed to load directory")
        }
        setRepoFiles(data)
        setFilePath(dirPath)
      } catch (err: any) {
        console.error("Failed to load directory:", err)
      } finally {
        setFilesLoading(false)
      }
    },
    [selectedRepo]
  )

  const handleCopyToChat = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "user",
        content: `Here's a file for context:\n\n${content}`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ])
    setViewerFile(null)
  }, [])

  const handleSend = useCallback(
    async (content: string) => {
      const userMessage: MessageProps = {
        id: Date.now().toString(),
        role: "user",
        content,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      }

      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)

      const assistantId = (Date.now() + 1).toString()
      const assistantMessage: MessageProps = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      }
      setMessages((prev) => [...prev, assistantMessage])

      try {
        const abort = new AbortController()
        abortRef.current = abort

        // Build messages with repo context if active
        const contextualMessages: { role: string; content: string }[] = [
          ...messages,
          userMessage,
        ].map((m) => ({
          role: m.role,
          content: m.content,
        }))

        if (selectedRepo) {
          contextualMessages.unshift({
            role: "system",
            content: `You are assisting with the repository ${selectedRepo.full_name} (default branch: ${selectedRepo.default_branch}).`,
          })
        }

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abort.signal,
          body: JSON.stringify({
            model: selectedModel,
            messages: contextualMessages,
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
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: fullContent } : m
            )
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
    [messages, selectedModel, selectedRepo]
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
    <div className="flex h-screen bg-[#0d1117]">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        chats={DEMO_CHATS}
        activeChat={activeChat}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        githubConnected={githubConnected}
        repos={repos}
        reposLoading={reposLoading}
        reposError={reposError}
        selectedRepo={selectedRepo}
        onConnectGitHub={handleConnectGitHub}
        onSelectRepo={handleSelectRepo}
        pinnedRepos={pinnedRepos}
        onTogglePin={handleTogglePin}
        repoSearch={repoSearch}
        onRepoSearch={setRepoSearch}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b border-gray-700 bg-[#161b22] px-4 py-2 pl-16 lg:pl-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm text-gray-100">Comfy AI</span>
            {selectedRepo && (
              <>
                <span className="text-gray-500">/</span>
                <button
                  onClick={() => setRepoPanelOpen(!repoPanelOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-md hover:bg-emerald-500/20 transition-colors"
                >
                  <Github className="w-3 h-3" />
                  {selectedRepo.full_name}
                  <ChevronDown
                    className={cn(
                      "w-3 h-3 transition-transform",
                      repoPanelOpen && "rotate-180"
                    )}
                  />
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedRepo && (
              <button
                onClick={() => setPrModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 rounded-lg transition-colors"
              >
                <GitPullRequest className="w-3.5 h-3.5" />
                Create PR
              </button>
            )}

            {/* Model Selector */}
            <div className="relative">
              <button
                onClick={() => setModelMenuOpen(!modelMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#21262d] border border-gray-700 hover:bg-gray-700 transition-colors text-sm"
              >
                <SelectedIcon className="w-4 h-4 text-emerald-400" />
                <span className="text-gray-100">{selectedModelInfo.name}</span>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 text-gray-400 transition-transform",
                    modelMenuOpen && "rotate-180"
                  )}
                />
              </button>

              {modelMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setModelMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-56 bg-[#161b22] rounded-xl border border-gray-700 shadow-lg py-1 z-50">
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
                            "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-700 transition-colors",
                            selectedModel === model.id && "bg-gray-700"
                          )}
                        >
                          <Icon
                            className={cn(
                              "w-4 h-4 shrink-0",
                              selectedModel === model.id
                                ? "text-emerald-400"
                                : "text-gray-400"
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-100">
                              {model.name}
                            </div>
                            <div className="text-xs text-gray-400">
                              {model.description}
                            </div>
                          </div>
                          {selectedModel === model.id && (
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {activePR && (
          <PRStatusBanner
            owner={activePR.owner}
            repo={activePR.repo}
            number={activePR.number}
            url={activePR.url}
            onDismiss={() => setActivePR(null)}
          />
        )}

        <div className="flex-1 flex overflow-hidden">
          {/* Main chat area */}
          <div className="flex-1 flex flex-col min-w-0">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center px-4">
                <div className="text-center max-w-2xl">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                    <Sparkles className="w-8 h-8 text-emerald-400" />
                  </div>

                  <h1 className="text-3xl font-semibold text-gray-100 mb-3">
                    Welcome to Comfy AI
                  </h1>
                  <p className="text-gray-400 mb-8 text-lg">
                    Your comfortable space for coding, creating, and conversing.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl mx-auto">
                    {WELCOME_SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleSuggestion(suggestion)}
                        className="flex items-center justify-between p-4 bg-[#161b22] rounded-xl border border-gray-700 hover:border-emerald-500/30 hover:shadow-sm transition-all text-left group"
                      >
                        <span className="text-sm text-gray-100">{suggestion}</span>
                        <ArrowRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
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

          {/* Repo file browser panel */}
          {repoPanelOpen && selectedRepo && (
            <>
              <div
                className="fixed inset-0 bg-black/10 z-30 lg:hidden"
                onClick={() => setRepoPanelOpen(false)}
              />
              <div className="w-72 bg-white border-l border-cream-200 flex flex-col z-40">
                <div className="flex items-center justify-between px-4 py-3 border-b border-cream-200">
                  <div className="flex items-center gap-2 min-w-0">
                    <FolderOpen className="w-4 h-4 text-claude-orange shrink-0" />
                    <span className="text-sm font-medium truncate">{selectedRepo.name}</span>
                  </div>
                  <button
                    onClick={() => setRepoPanelOpen(false)}
                    className="p-1 hover:bg-cream-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-claude-gray" />
                  </button>
                </div>

                <div className="px-3 py-2">
                  {filePath.length > 0 && (
                    <button
                      onClick={() => {
                        const parent = filePath.slice(0, -1)
                        if (parent.length === 0) {
                          handleSelectRepo(selectedRepo)
                        } else {
                          handleOpenDirectory(parent)
                        }
                      }}
                      className="text-xs text-claude-gray hover:text-claude-dark flex items-center gap-1 mb-2"
                    >
                      <ChevronRight className="w-3 h-3 rotate-180" />
                      Back
                    </button>
                  )}
                  <p className="text-xs text-claude-gray font-mono truncate">
                    {filePath.join("/") || "/"}
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
                  {filesLoading ? (
                    <div className="flex items-center gap-2 px-2 py-3 text-claude-gray">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Loading...</span>
                    </div>
                  ) : (
                    repoFiles.map((item) => (
                      <button
                        key={item.sha}
                        onClick={() => {
                          if (item.type === "dir") {
                            handleOpenDirectory([...filePath, item.name])
                          } else {
                            handleOpenFile([...filePath, item.name])
                          }
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-cream-50 transition-colors"
                      >
                        {item.type === "dir" ? (
                          <FolderOpen className="w-4 h-4 text-claude-orange shrink-0" />
                        ) : (
                          <FileCode className="w-4 h-4 text-claude-gray shrink-0" />
                        )}
                        <span
                          className={cn(
                            "text-sm truncate",
                            item.type === "dir"
                              ? "font-medium text-claude-dark"
                              : "text-claude-dark"
                          )}
                        >
                          {item.name}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* File viewer modal */}
      {viewerFile && (
        <FileViewer
          file={viewerFile}
          repo={
            selectedRepo
              ? {
                  owner: selectedRepo.owner.login,
                  repo: selectedRepo.name,
                  default_branch: selectedRepo.default_branch,
                }
              : undefined
          }
          onClose={() => setViewerFile(null)}
          onCopyToChat={handleCopyToChat}
        />
      )}

      {/* PR modal */}
      {prModalOpen && selectedRepo && (
        <PRModal
          repo={{
            owner: selectedRepo.owner.login,
            repo: selectedRepo.name,
            default_branch: selectedRepo.default_branch,
          }}
          onClose={() => setPrModalOpen(false)}
          onSuccess={(url, number) => {
            if (selectedRepo) {
              setActivePR({
                owner: selectedRepo.owner.login,
                repo: selectedRepo.name,
                number,
                url,
              })
            }
          }}
        />
      )}
    </div>
  )
}
