"use client"

import React, { useState, useCallback, useRef, useEffect } from "react"
import { Sidebar, type GitHubRepoItem, type WebhookEventItem } from "@/components/sidebar"
import { MessageList } from "./message-list"
import { ChatInput } from "./chat-input"
import { ModelPicker } from "./model-picker"
import { ModePicker } from "./mode-picker"
import { MessageProps } from "./message"
import { FileViewer } from "@/components/file-viewer"
import { PRModal } from "@/components/pr-modal"
import { PRStatusBanner } from "@/components/pr-status-banner"
import { MODELS, getBestVisionModel, getModel, DEFAULT_MODEL_ID } from "@/lib/models"
import { MODES, MODE_MAP, DEFAULT_MODE, type AppMode } from "@/lib/modes"
import { VISION_MODELS } from "@/lib/tokens"
import {
  Sparkles, ChevronDown, Github, Menu,
  FolderOpen, FileCode, ChevronRight,
  GitPullRequest, X, Loader2, StopCircle, Plus, Trash2, Users,
  CheckCircle, AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { CouncilPanel } from "./council/CouncilPanel"

interface GitHubFileItem {
  name: string
  path: string
  type: "file" | "dir"
  sha: string
}

// ─── helpers ────────────────────────────────────────────────────────────────

function savePrefs(patch: Record<string, unknown>) {
  fetch("/api/user/prefs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  }).catch(() => {})
}

// ─── component ──────────────────────────────────────────────────────────────

export function ChatInterface() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [messages, setMessages] = useState<MessageProps[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [mode, setMode] = useState<AppMode>(DEFAULT_MODE)
  const [selectedModel, setSelectedModel] = useState(() => MODE_MAP[DEFAULT_MODE].chatModel)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const lastSavedCountRef = useRef(0)
  const conversationIdRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const saveStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep conversationIdRef in sync (avoids stale closure in handleSend)
  useEffect(() => { conversationIdRef.current = conversationId }, [conversationId])

  // GitHub state
  const [githubConnected, setGithubConnected] = useState(false)
  const [repos, setRepos] = useState<GitHubRepoItem[]>([])
  const [reposLoading, setReposLoading] = useState(false)
  const [reposError, setReposError] = useState<string | null>(null)
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepoItem | null>(null)
  const [repoFiles, setRepoFiles] = useState<GitHubFileItem[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [filePath, setFilePath] = useState<string[]>([])
  const [viewerFile, setViewerFile] = useState<{ name: string; path: string; content: string; html_url: string } | null>(null)
  const [prModalOpen, setPrModalOpen] = useState(false)
  const [activePR, setActivePR] = useState<{ owner: string; repo: string; number: number; url: string } | null>(null)
  const [repoPanelOpen, setRepoPanelOpen] = useState(false)
  const [repoPanelTab, setRepoPanelTab] = useState<"files" | "history">("files")
  const [repoConversations, setRepoConversations] = useState<{ id: string; title: string | null; updatedAt: string }[]>([])
  const [repoConversationsLoading, setRepoConversationsLoading] = useState(false)
  const [pinnedRepos, setPinnedRepos] = useState<string[]>([])
  const [repoSearch, setRepoSearch] = useState("")

  // Webhook events
  const [webhookEvents, setWebhookEvents] = useState<WebhookEventItem[]>([])
  const [webhookEventsLoading, setWebhookEventsLoading] = useState(false)

  // Docs context
  const [availableDocs, setAvailableDocs] = useState<string[]>([])
  const [activeDocFiles, setActiveDocFiles] = useState<string[]>([])
  const [docsContext, setDocsContext] = useState("")
  const [docsPanelOpen, setDocsPanelOpen] = useState(false)

  // Council — auto-triggers after every AI response
  const [councilOpen, setCouncilOpen] = useState(false)
  const [councilTask, setCouncilTask] = useState("")
  const skipCouncilRef = useRef(false) // set true when council itself sends a follow-up

  // ── Escape to stop generation ─────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isLoading) abortRef.current?.abort()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isLoading])

  // Save is handled directly inside handleSend (not via effect) to avoid
  // closure race conditions when the user switches repos mid-stream.

  // ── History button handlers ──────────────────────────────────────────────
  const handleNewChat = useCallback(() => {
    setMessages([])
    setConversationId(null)
    conversationIdRef.current = null
    lastSavedCountRef.current = 0
  }, [])

  const handleLoadConversation = useCallback((conv: { id: string; messages: { role: string; content: string; createdAt: string }[] }) => {
    const loaded: MessageProps[] = conv.messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m, i) => ({
        id: `${conv.id}-${i}`,
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }))
    setMessages(loaded)
    setConversationId(conv.id)
    conversationIdRef.current = conv.id
    lastSavedCountRef.current = loaded.length
  }, [])

  // ── Repo history ──────────────────────────────────────────────────────────
  const loadRepoHistory = useCallback(async () => {
    if (!selectedRepo) return
    setRepoConversationsLoading(true)
    try {
      const res = await fetch("/api/conversations?userId=default")
      if (res.ok) {
        const data = await res.json()
        setRepoConversations(
          Array.isArray(data) ? data.filter((c: any) => c.repoName === selectedRepo.name) : []
        )
      }
    } catch {}
    finally { setRepoConversationsLoading(false) }
  }, [selectedRepo])

  useEffect(() => {
    if (repoPanelOpen && repoPanelTab === "history") loadRepoHistory()
  }, [repoPanelOpen, repoPanelTab, loadRepoHistory, conversationId])

  useEffect(() => { setRepoPanelTab("files") }, [selectedRepo?.name])

  const handleDeleteRepoConversation = useCallback(async (id: string) => {
    await fetch(`/api/conversations?conversationId=${id}`, { method: "DELETE" })
    setRepoConversations((prev) => prev.filter((c) => c.id !== id))
  }, [])

  // ── Startup: load prefs + docs together so we can auto-enable docs ───────
  useEffect(() => {
    Promise.all([
      fetch("/api/user/prefs").then((r) => r.json()).catch(() => ({})),
      fetch("/api/docs").then((r) => r.json()).catch(() => []),
    ]).then(async ([data, docList]) => {
      // Prefs
      if (data.pinnedRepos) setPinnedRepos(data.pinnedRepos)
      const s = data.settings ?? {}
      if (s.selectedModel) setSelectedModel(s.selectedModel)
      if (s.mode && MODE_MAP[s.mode as AppMode]) setMode(s.mode as AppMode)

      // Docs — auto-enable all on first visit (no saved preference yet)
      const docs: string[] = Array.isArray(docList) ? docList : []
      setAvailableDocs(docs)
      if (Array.isArray(s.activeDocFiles)) {
        setActiveDocFiles(s.activeDocFiles)
      } else if (docs.length > 0) {
        // First time: enable all docs automatically
        setActiveDocFiles(docs)
        savePrefs({ settings: { activeDocFiles: docs } })
      }

      // Restore selected repo
      if (s.selectedRepo) {
        try {
          const res = await fetch("/api/github/repos")
          if (res.ok) {
            const all: GitHubRepoItem[] = await res.json()
            setRepos(all)
            setGithubConnected(true)
            const match = all.find((r) => r.full_name === s.selectedRepo)
            if (match) { setSelectedRepo(match); setRepoPanelOpen(false) }
          }
        } catch {}
      }
    })
  }, [])

  // ── Load webhook events ───────────────────────────────────────────────────
  useEffect(() => {
    setWebhookEventsLoading(true)
    fetch("/api/webhooks/events?limit=20")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setWebhookEvents(data) })
      .catch(() => {})
      .finally(() => setWebhookEventsLoading(false))
  }, [])

  // ── Rebuild docs context string when selection changes ────────────────────
  useEffect(() => {
    if (activeDocFiles.length === 0) { setDocsContext(""); return }
    Promise.all(
      activeDocFiles.map((f) =>
        fetch(`/api/docs?file=${encodeURIComponent(f)}`)
          .then((r) => r.json())
          .then((d) => (d.content ? `## ${d.name}\n\n${d.content}` : null))
          .catch(() => null)
      )
    ).then((parts) => {
      const combined = parts.filter(Boolean).join("\n\n---\n\n")
      setDocsContext(combined ? `Project documentation for context:\n\n${combined}` : "")
    })
  }, [activeDocFiles])

  // ── Mode change — updates model automatically ─────────────────────────────
  const handleModeChange = useCallback((newMode: AppMode) => {
    setMode(newMode)
    const chatModel = MODE_MAP[newMode].chatModel
    setSelectedModel(chatModel)
    savePrefs({ settings: { selectedModel: chatModel, mode: newMode } })
  }, [])

  // ── Save selectedModel to Neon when it changes ────────────────────────────
  const handleModelChange = useCallback((modelId: string) => {
    setSelectedModel(modelId)
    savePrefs({ settings: { selectedModel: modelId } })
  }, [])

  // ── Save activeDocFiles to Neon ───────────────────────────────────────────
  const toggleDoc = useCallback((file: string) => {
    setActiveDocFiles((prev) => {
      const next = prev.includes(file) ? prev.filter((f) => f !== file) : [...prev, file]
      savePrefs({ settings: { activeDocFiles: next } })
      return next
    })
  }, [])

  // ── GitHub handlers ───────────────────────────────────────────────────────
  const handleConnectGitHub = useCallback(async () => {
    setReposLoading(true); setReposError(null)
    try {
      const res = await fetch("/api/github/repos")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to connect")
      setRepos(data); setGithubConnected(true)
    } catch (err: any) {
      setReposError(err.message)
    } finally {
      setReposLoading(false)
    }
  }, [])

  const handleSelectRepo = useCallback(async (repo: GitHubRepoItem) => {
    setSelectedRepo(repo); setFilePath([]); setRepoFiles([])
    setRepoPanelOpen(true); setSidebarOpen(false)
    // Start a fresh conversation when switching repos
    setMessages([])
    setConversationId(null)
    conversationIdRef.current = null
    lastSavedCountRef.current = 0
    savePrefs({ settings: { selectedRepo: repo.full_name } })
    setFilesLoading(true)
    try {
      const res = await fetch(`/api/github/repo/${repo.owner.login}/${repo.name}/files`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load files")
      setRepoFiles(data)
    } catch (err: any) {
      console.error("Failed to load repo files:", err)
    } finally {
      setFilesLoading(false)
    }
  }, [])

  const handleOpenFile = useCallback(async (segments: string[]) => {
    if (!selectedRepo) return
    try {
      const path = segments.join("/")
      const res = await fetch(`/api/github/repo/${selectedRepo.owner.login}/${selectedRepo.name}/files/${path}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load file")
      setViewerFile(data)
    } catch (err: any) {
      console.error("Failed to load file:", err)
    }
  }, [selectedRepo])

  const handleOpenDirectory = useCallback(async (dirPath: string[]) => {
    if (!selectedRepo) return
    setFilesLoading(true)
    try {
      const path = dirPath.join("/")
      const res = await fetch(`/api/github/repo/${selectedRepo.owner.login}/${selectedRepo.name}/files?path=${encodeURIComponent(path)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load directory")
      setRepoFiles(data); setFilePath(dirPath)
    } catch (err: any) {
      console.error("Failed to load directory:", err)
    } finally {
      setFilesLoading(false)
    }
  }, [selectedRepo])

  const handleTogglePin = useCallback((repoId: number) => {
    const id = String(repoId)
    setPinnedRepos((prev) => {
      const next = prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
      savePrefs({ pinnedRepos: next })
      return next
    })
  }, [])

  // ── Copy file to chat ─────────────────────────────────────────────────────
  const handleCopyToChat = useCallback((content: string) => {
    setViewerFile(null)
    // Don't auto-send — let user review and send
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "user" as const,
        content,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ])
  }, [])

  // ── Core send handler ─────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (content: string, images?: string[]) => {
      // Auto-switch to vision model if images are attached and model doesn't support vision
      let model = selectedModel
      if (images && images.length > 0 && !VISION_MODELS.has(model)) {
        const best = getBestVisionModel(model)
        model = best.id
        setSelectedModel(best.id)
        savePrefs({ settings: { selectedModel: best.id } })
      }

      // Auto-fetch URLs mentioned in the message
      let enrichedContent = content
      const urls = content.match(/https?:\/\/[^\s\)\]\>"]+/g)
      if (urls) {
        const results = await Promise.all(
          urls.map((url) =>
            fetch("/api/fetch-url", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url }),
            })
              .then((r) => r.ok ? r.json() : null)
              .catch(() => null)
          )
        )
        const valid = results.filter(Boolean) as { title: string; content: string; url: string }[]
        if (valid.length > 0) {
          enrichedContent = `${content}\n\n${valid.map((r) => `--- Content from ${r.url} ---\n${r.content}\n---`).join("\n\n")}`
        }
      }

      const userMsg: MessageProps = {
        id: Date.now().toString(),
        role: "user",
        content: enrichedContent,
        images,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
      setMessages((prev) => [...prev, userMsg])
      setIsLoading(true)

      const assistantId = (Date.now() + 1).toString()
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", isStreaming: true, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
      ])

      try {
        const abort = new AbortController()
        abortRef.current = abort

        // Build context messages
        const contextMessages: { role: string; content: string; images?: string[] }[] = [
          ...messages,
          userMsg,
        ].map((m) => ({ role: m.role, content: m.content, ...(m.images ? { images: m.images } : {}) }))

        // Inject repo context
        if (selectedRepo) {
          contextMessages.unshift({
            role: "system",
            content: `You are assisting with the GitHub repository ${selectedRepo.full_name} (default branch: ${selectedRepo.default_branch}).`,
          })
        }
        // Inject docs context — skip for local Ollama models (large context slows them down)
        const isCloudModel = model.startsWith("claude-") || model.startsWith("grok-")
        if (docsContext && isCloudModel) {
          contextMessages.unshift({ role: "system", content: docsContext })
        }

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abort.signal,
          body: JSON.stringify({ model, messages: contextMessages, stream: true }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || `HTTP ${res.status}`)
        }

        const reader = res.body?.getReader()
        if (!reader) throw new Error("No response body")
        const decoder = new TextDecoder()
        let full = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          full += decoder.decode(value, { stream: true })
          setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: full, isStreaming: false } : m))
        }

        // Auto-trigger Agent Council for expert/heavy modes only
        const councilEnabled = MODE_MAP[mode].councilEnabled
        if (full && enrichedContent && councilEnabled && !skipCouncilRef.current) {
          setCouncilTask(enrichedContent)
          setCouncilOpen(true)
        }
        skipCouncilRef.current = false

        // Save conversation — done here (not in a useEffect) so selectedRepo and
        // messages are captured from the exact moment the user hit Send, avoiding
        // race conditions when the user switches repos before save fires.
        if (full) {
          const toSave = [
            ...messages.slice(lastSavedCountRef.current),
            { role: "user" as const, content: enrichedContent },
            { role: "assistant" as const, content: full },
          ].map((m) => ({ role: m.role, content: m.content, metadata: {} }))

          const repoCtx = selectedRepo
            ? { repoOwner: selectedRepo.owner.login, repoName: selectedRepo.name }
            : undefined
          const currentConvId = conversationIdRef.current
          const newCount = messages.length + 2

          setSaveStatus("saving")
          fetch("/api/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: "default", conversationId: currentConvId, messages: toSave, repoContext: repoCtx }),
          })
            .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
            .then((data) => {
              if (data?.conversationId) {
                conversationIdRef.current = data.conversationId
                setConversationId(data.conversationId)
              }
              lastSavedCountRef.current = newCount
              setSaveStatus("saved")
              if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current)
              saveStatusTimerRef.current = setTimeout(() => setSaveStatus("idle"), 3000)
            })
            .catch((err) => {
              console.error("Save failed:", err)
              setSaveStatus("error")
              if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current)
              saveStatusTimerRef.current = setTimeout(() => setSaveStatus("idle"), 5000)
            })
        }
      } catch (err: any) {
        if (err.name === "AbortError") return
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `**Error:** ${err.message || "Failed to reach the model."}` }
              : m
          )
        )
      } finally {
        setIsLoading(false)
        abortRef.current = null
      }
    },
    [messages, selectedModel, selectedRepo, docsContext]
  )

  // ── Slash command handler ─────────────────────────────────────────────────
  const handleCommand = useCallback(
    (command: string, arg: string) => {
      switch (command) {
        case "clear":
          setMessages([])
          break
        case "model": {
          const match = MODELS.find((m) => m.id === arg || m.name.toLowerCase().includes(arg.toLowerCase()))
          if (match) {
            handleModelChange(match.id)
            setMessages((prev) => [
              ...prev,
              { id: Date.now().toString(), role: "assistant" as const, content: `Switched to **${match.name}**.`, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
            ])
          } else {
            setMessages((prev) => [
              ...prev,
              { id: Date.now().toString(), role: "assistant" as const, content: `Model not found: \`${arg}\`. Use the model picker in the header.`, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
            ])
          }
          break
        }
        case "repo": {
          const match = repos.find((r) => r.name.toLowerCase().includes(arg.toLowerCase()) || r.full_name.toLowerCase().includes(arg.toLowerCase()))
          if (match) {
            handleSelectRepo(match)
          } else {
            setMessages((prev) => [
              ...prev,
              { id: Date.now().toString(), role: "assistant" as const, content: `Repo not found: \`${arg}\`. Connect GitHub first if needed.`, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
            ])
          }
          break
        }
        case "pr":
          if (selectedRepo) setPrModalOpen(true)
          else setMessages((prev) => [
            ...prev,
            { id: Date.now().toString(), role: "assistant" as const, content: "No repo selected. Use the GitHub sidebar to select a repo first.", timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
          ])
          break
        case "docs":
          setDocsPanelOpen((p) => !p)
          break
        case "help":
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: "assistant" as const,
              content: `**Available commands:**\n\n| Command | Description |\n|---|---|\n| \`/clear\` | Clear conversation |\n| \`/model <id>\` | Switch model |\n| \`/repo <name>\` | Select GitHub repo |\n| \`/pr\` | Open Create PR modal |\n| \`/docs\` | Toggle docs context panel |\n| \`/help\` | Show this message |`,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ])
          break
      }
    },
    [repos, selectedRepo, handleModelChange, handleSelectRepo]
  )

  // ── Webhook event handler ─────────────────────────────────────────────────
  const handleSelectEvent = useCallback(
    async (event: WebhookEventItem) => {
      fetch(`/api/webhooks/events/${event.id}/read`, { method: "POST" }).catch(() => {})
      setWebhookEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, read: true } : e)))

      let summary = ""
      if (event.eventType === "pull_request") {
        const pr = event.payload?.pull_request
        summary = `GitHub event: PR #${pr?.number || "?"} ${event.action} in ${event.repoOwner}/${event.repoName}.\nTitle: ${pr?.title || event.title || "No title"}.\nURL: ${pr?.html_url || ""}\n\nWhat should I know about this PR?`
      } else if (event.eventType === "workflow_run") {
        const run = event.payload?.workflow_run
        summary = `GitHub CI event: ${event.action} on branch "${run?.head_branch || "unknown"}" in ${event.repoOwner}/${event.repoName}.\nWorkflow: ${run?.name || event.title || ""}.\nURL: ${run?.html_url || ""}\n\nSummarise what happened and suggest next steps.`
      } else if (event.eventType === "push") {
        const branch = event.title || event.payload?.ref?.replace("refs/heads/", "") || "unknown"
        const commits = (event.payload?.commits || []).slice(0, 5).map((c: any) => `- ${c.message}`).join("\n")
        summary = `GitHub push to "${branch}" in ${event.repoOwner}/${event.repoName}.\nCommits:\n${commits}\n\nBriefly summarise these changes.`
      } else {
        summary = `GitHub event: ${event.eventType} (${event.action}) in ${event.repoOwner}/${event.repoName}. What does this mean?`
      }
      handleSend(summary)
    },
    [handleSend]
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-dvh bg-[#0d1117]">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
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
        webhookEvents={webhookEvents}
        webhookEventsLoading={webhookEventsLoading}
        onSelectEvent={handleSelectEvent}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b border-gray-700 bg-[#161b22] px-3 py-2 flex items-center gap-2 min-w-0 h-12">
          {/* Hamburger */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors shrink-0"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5 text-gray-400" />
          </button>

          {/* Logo — blue dot on icon when docs active (mobile), full badge on desktop */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="relative">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              {activeDocFiles.length > 0 && (
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-400 ring-1 ring-[#161b22] sm:hidden" />
              )}
            </div>
            <span className="font-semibold text-sm text-gray-100 whitespace-nowrap hidden sm:inline">Comfy AI</span>
          </div>

          {/* Repo badge */}
          {selectedRepo && (
            <button
              onClick={() => setRepoPanelOpen(!repoPanelOpen)}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-md hover:bg-emerald-500/20 transition-colors min-w-0 max-w-[90px] sm:max-w-none"
            >
              <Github className="w-3 h-3 shrink-0" />
              <span className="truncate">{selectedRepo.name}</span>
              <ChevronDown className={cn("w-3 h-3 shrink-0 transition-transform", repoPanelOpen && "rotate-180")} />
            </button>
          )}

          {/* Docs badge — desktop only; mobile uses dot indicator on logo */}
          {activeDocFiles.length > 0 && (
            <span className="hidden sm:inline-flex shrink-0 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded-md whitespace-nowrap">
              {activeDocFiles.length} docs active
            </span>
          )}

          <div className="flex-1" />

          {/* Stop */}
          {isLoading && (
            <button
              onClick={() => abortRef.current?.abort()}
              className="flex items-center gap-1 px-2 py-1.5 text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 rounded-lg transition-colors shrink-0"
              title="Stop generation (Escape)"
            >
              <StopCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Stop</span>
            </button>
          )}

          {/* Create PR — desktop only */}
          {selectedRepo && (
            <button
              onClick={() => setPrModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 rounded-lg transition-colors shrink-0"
            >
              <GitPullRequest className="w-3.5 h-3.5" />
              Create PR
            </button>
          )}

          {/* Save status */}
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1 text-[11px] text-gray-500 shrink-0">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="hidden sm:inline">Saving…</span>
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-500 shrink-0">
              <CheckCircle className="w-3 h-3" />
              <span className="hidden sm:inline">Saved</span>
            </span>
          )}
          {saveStatus === "error" && (
            <span className="flex items-center gap-1 text-[11px] text-red-400 shrink-0" title="Conversation failed to save">
              <AlertCircle className="w-3 h-3" />
              <span className="hidden sm:inline">Save failed</span>
            </span>
          )}

          <ModePicker
            mode={mode}
            selectedModel={selectedModel}
            onModeChange={handleModeChange}
            onModelChange={handleModelChange}
          />
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
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                    <Sparkles className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h1 className="text-3xl font-semibold text-gray-100 mb-3">Welcome to Comfy AI</h1>
                  <p className="text-gray-400 text-lg">Your comfortable space for coding, creating, and conversing.</p>
                </div>
              </div>
            ) : (
              <MessageList messages={messages} isLoading={isLoading} />
            )}
            <ChatInput
              onSend={handleSend}
              onCommand={handleCommand}
              onCouncil={(task) => { setCouncilTask(task); setCouncilOpen(true) }} // @council override
              isLoading={isLoading}
            />
          </div>

          {/* Docs panel */}
          {docsPanelOpen && (
            <>
              <div className="fixed inset-0 bg-black/10 z-30 lg:hidden" onClick={() => setDocsPanelOpen(false)} />
              <div className="w-64 bg-[#161b22] border-l border-gray-700 flex flex-col z-40">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                  <span className="text-sm font-medium text-gray-100">Docs Context</span>
                  <button onClick={() => setDocsPanelOpen(false)} className="p-1 hover:bg-gray-700 rounded-lg transition-colors">
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                  {availableDocs.length === 0 ? (
                    <p className="text-xs text-gray-500 px-1">No docs found in /docs folder.</p>
                  ) : (
                    availableDocs.map((doc) => (
                      <label key={doc} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-700/50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activeDocFiles.includes(doc)}
                          onChange={() => toggleDoc(doc)}
                          className="accent-emerald-500"
                        />
                        <span className="text-sm text-gray-200 truncate">{doc}</span>
                      </label>
                    ))
                  )}
                </div>
                {activeDocFiles.length > 0 && (
                  <div className="px-3 py-2 border-t border-gray-700">
                    <p className="text-xs text-emerald-400">{activeDocFiles.length} doc(s) injected as system context</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Repo panel — Files + History tabs */}
          {repoPanelOpen && selectedRepo && (
            <>
              <div className="fixed inset-0 bg-black/20 z-30 lg:hidden" onClick={() => setRepoPanelOpen(false)} />
              <div className="fixed right-0 top-12 bottom-0 lg:relative lg:top-auto lg:bottom-auto w-72 bg-[#161b22] border-l border-gray-700 flex flex-col z-40">

                {/* Panel header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                  <div className="flex items-center gap-2 min-w-0">
                    <Github className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-sm font-medium truncate text-gray-100">{selectedRepo.name}</span>
                  </div>
                  <button onClick={() => setRepoPanelOpen(false)} className="p-1 hover:bg-gray-700 rounded-lg transition-colors">
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-700 shrink-0">
                  {(["files", "history"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setRepoPanelTab(tab)}
                      className={cn(
                        "flex-1 py-2 text-xs font-medium capitalize transition-colors border-b-2",
                        repoPanelTab === tab
                          ? "text-emerald-400 border-emerald-400"
                          : "text-gray-500 border-transparent hover:text-gray-300"
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Files tab */}
                {repoPanelTab === "files" && (
                  <>
                    <div className="px-3 py-2 shrink-0">
                      {filePath.length > 0 && (
                        <button
                          onClick={() => {
                            const parent = filePath.slice(0, -1)
                            parent.length === 0 ? handleSelectRepo(selectedRepo) : handleOpenDirectory(parent)
                          }}
                          className="text-xs text-gray-400 hover:text-gray-100 flex items-center gap-1 mb-2"
                        >
                          <ChevronRight className="w-3 h-3 rotate-180" />
                          Back
                        </button>
                      )}
                      <p className="text-xs text-gray-600 font-mono truncate">{filePath.join("/") || "/"}</p>
                    </div>
                    <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
                      {filesLoading ? (
                        <div className="flex items-center gap-2 px-2 py-3 text-gray-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Loading…</span>
                        </div>
                      ) : (
                        repoFiles.map((item) => (
                          <button
                            key={item.sha}
                            onClick={() => item.type === "dir" ? handleOpenDirectory([...filePath, item.name]) : handleOpenFile([...filePath, item.name])}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-gray-700/50 transition-colors"
                          >
                            {item.type === "dir"
                              ? <FolderOpen className="w-4 h-4 text-emerald-400/70 shrink-0" />
                              : <FileCode className="w-4 h-4 text-gray-500 shrink-0" />
                            }
                            <span className={cn("text-sm truncate", item.type === "dir" ? "font-medium text-gray-200" : "text-gray-300")}>
                              {item.name}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}

                {/* History tab */}
                {repoPanelTab === "history" && (
                  <>
                    <div className="px-3 py-2 border-b border-gray-700/50 shrink-0 flex items-center justify-between">
                      <span className="text-xs text-gray-500">{selectedRepo.name} conversations</span>
                      <button
                        onClick={() => { handleNewChat(); setRepoPanelOpen(false) }}
                        className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
                      >
                        <Plus className="w-3 h-3" />
                        New chat
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {repoConversationsLoading ? (
                        <div className="flex items-center justify-center gap-2 p-6 text-gray-500">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading…
                        </div>
                      ) : repoConversations.length === 0 ? (
                        <div className="p-6 text-center text-sm text-gray-500">No conversations yet for this repo</div>
                      ) : (
                        repoConversations.map((conv) => {
                          const isActive = conv.id === conversationId
                          return (
                            <button
                              key={conv.id}
                              onClick={() => {
                                fetch(`/api/conversations?conversationId=${conv.id}`)
                                  .then((r) => r.ok ? r.json() : null)
                                  .then((data) => { if (data) { handleLoadConversation(data); setRepoPanelOpen(false) } })
                                  .catch(() => {})
                              }}
                              className={cn(
                                "w-full text-left px-3 py-2.5 hover:bg-gray-700/50 transition-colors group flex items-start gap-2 border-b border-gray-700/30 last:border-0",
                                isActive && "bg-gray-700/40"
                              )}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="text-sm text-gray-100 truncate">{conv.title || "Untitled"}</div>
                                <div className="text-[11px] text-gray-500 mt-0.5">
                                  {new Date(conv.updatedAt).toLocaleDateString()}
                                </div>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteRepoConversation(conv.id) }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-opacity shrink-0"
                                aria-label="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {viewerFile && (
        <FileViewer
          file={viewerFile}
          repo={selectedRepo ? { owner: selectedRepo.owner.login, repo: selectedRepo.name, default_branch: selectedRepo.default_branch } : undefined}
          onClose={() => setViewerFile(null)}
          onCopyToChat={handleCopyToChat}
        />
      )}

      {prModalOpen && selectedRepo && (
        <PRModal
          repo={{ owner: selectedRepo.owner.login, repo: selectedRepo.name, default_branch: selectedRepo.default_branch }}
          onClose={() => setPrModalOpen(false)}
          onSuccess={(url, number) => {
            setActivePR({ owner: selectedRepo.owner.login, repo: selectedRepo.name, number, url })
          }}
        />
      )}

      <CouncilPanel
        task={councilTask}
        selectedModel={selectedModel}
        open={councilOpen}
        onClose={() => setCouncilOpen(false)}
        onApprove={(plan) => {
          setCouncilOpen(false)
          skipCouncilRef.current = true // don't re-trigger council for the AI's implementation response
          handleSend(`The Agent Council has approved this plan — please implement it:\n\n${plan}`)
        }}
      />
    </div>
  )
}
