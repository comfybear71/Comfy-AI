"use client"

import React, { useState } from "react"
import {
  Plus,
  MessageSquare,
  Settings,
  User,
  X,
  Github,
  Book,
  ChevronRight,
  Loader2,
  AlertCircle,
  Moon,
  Sun,
  Search,
  Pin,
  PinOff,
  GitPullRequest,
  GitCommit,
  CheckCircle,
  AlertTriangle,
  Bell,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useTheme } from "./theme-provider"

export interface GitHubRepoItem {
  id: number
  name: string
  full_name: string
  description: string | null
  private: boolean
  default_branch: string
  owner: { login: string; avatar_url: string }
}

export interface WebhookEventItem {
  id: number
  eventType: string
  action: string
  repoOwner: string
  repoName: string
  title: string | null
  payload: any
  read: boolean
  createdAt: Date | null
}

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  githubConnected?: boolean
  repos?: GitHubRepoItem[]
  reposLoading?: boolean
  reposError?: string | null
  selectedRepo?: GitHubRepoItem | null
  onConnectGitHub?: () => void
  onSelectRepo?: (repo: GitHubRepoItem) => void
  pinnedRepos?: string[]
  onTogglePin?: (repoId: number) => void
  repoSearch?: string
  onRepoSearch?: (query: string) => void
  webhookEvents?: WebhookEventItem[]
  webhookEventsLoading?: boolean
  onSelectEvent?: (event: WebhookEventItem) => void
}

export function Sidebar({
  isOpen,
  onToggle,
  githubConnected,
  repos,
  reposLoading,
  reposError,
  selectedRepo,
  onConnectGitHub,
  onSelectRepo,
  pinnedRepos = [],
  onTogglePin,
  repoSearch = "",
  onRepoSearch,
  webhookEvents = [],
  webhookEventsLoading = false,
  onSelectEvent,
}: SidebarProps) {
  const { resolvedTheme, toggleTheme } = useTheme()
  const [showAll, setShowAll] = useState(false)

  function formatRelativeTime(date: Date | null): string {
    if (!date) return ""
    const now = new Date()
    const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000)
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  function getEventIcon(event: WebhookEventItem) {
    if (event.eventType === "pull_request") return GitPullRequest
    if (event.eventType === "workflow_run") {
      return event.action === "success" ? CheckCircle : AlertTriangle
    }
    if (event.eventType === "push") return GitCommit
    return Bell
  }

  function getEventDisplayText(event: WebhookEventItem): string {
    if (event.eventType === "pull_request") {
      const prNumber = event.payload?.pull_request?.number
      const numStr = prNumber ? ` #${prNumber}` : ""
      return `PR${numStr} ${event.action} in ${event.repoOwner}/${event.repoName}`
    }
    if (event.eventType === "workflow_run") {
      const branch = event.payload?.workflow_run?.head_branch || "unknown"
      const status = event.action === "success" ? "passed" : "failed"
      return `CI ${status} on ${branch}`
    }
    if (event.eventType === "push") {
      const branch = event.title || event.payload?.ref?.replace("refs/heads/", "") || "unknown"
      return `Push to ${branch} in ${event.repoOwner}/${event.repoName}`
    }
    return `${event.eventType} in ${event.repoOwner}/${event.repoName}`
  }

  const filteredRepos = repos?.filter((r) =>
    r.name.toLowerCase().includes(repoSearch.toLowerCase()) ||
    r.full_name.toLowerCase().includes(repoSearch.toLowerCase())
  )

  const pinned = filteredRepos?.filter((r) => pinnedRepos.includes(String(r.id))) || []
  const unpinned = filteredRepos?.filter((r) => !pinnedRepos.includes(String(r.id))) || []
  const displayRepos = showAll ? [...pinned, ...unpinned] : [...pinned, ...unpinned].slice(0, 10)

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:relative inset-y-0 left-0 z-50 flex-shrink-0 bg-[#f5f5f0] dark:bg-gray-800 border-r border-cream-200 dark:border-gray-700 flex flex-col transition-all duration-200 ease-in-out overflow-hidden",
          isOpen
            ? "w-72 translate-x-0"
            : "-translate-x-full w-72 lg:translate-x-0 lg:w-0 lg:border-0"
        )}
      >
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-claude-orange flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-5 h-5 text-white"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="font-semibold text-lg tracking-tight dark:text-gray-100">Comfy AI</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin space-y-4">
          {/* GitHub Section */}
          <div>
            <div className="text-xs font-medium text-claude-gray dark:text-gray-400 uppercase tracking-wider mb-2 px-2 flex items-center justify-between">
              <span>GitHub</span>
              <span className="text-[10px] normal-case">
                {pinned.length} / {repos?.length || 0}
              </span>
            </div>

            {githubConnected && (
              <div className="px-2 mb-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-claude-gray dark:text-gray-400" />
                  <input
                    type="text"
                    value={repoSearch}
                    onChange={(e) => onRepoSearch?.(e.target.value)}
                    placeholder="Filter repos..."
                    className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg bg-white dark:bg-gray-700 border border-cream-200 dark:border-gray-600 text-claude-dark dark:text-gray-100 placeholder:text-claude-gray/60 focus:outline-none focus:ring-1 focus:ring-claude-orange/30"
                  />
                </div>
              </div>
            )}

            {!githubConnected ? (
              <button
                onClick={onConnectGitHub}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors bg-white dark:bg-gray-700 border border-cream-200 dark:border-gray-600 hover:border-claude-orange/30 shadow-sm"
              >
                <Github className="w-4 h-4 text-claude-dark dark:text-gray-200 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium dark:text-gray-100">Connect to GitHub</div>
                  <div className="text-xs text-claude-gray dark:text-gray-400">Browse repos and create PRs</div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-claude-gray dark:text-gray-400 shrink-0" />
              </button>
            ) : reposLoading ? (
              <div className="flex items-center gap-2 px-2 py-3 text-claude-gray dark:text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading repos...</span>
              </div>
            ) : reposError ? (
              <div className="flex items-start gap-2 px-2 py-3 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="text-xs">{reposError}</span>
              </div>
            ) : (
              <div className="space-y-0.5">
                {displayRepos.map((repo) => {
                  const isPinned = pinnedRepos.includes(String(repo.id))
                  return (
                    <div
                      key={repo.id}
                      className={cn(
                        "group flex items-center gap-1 px-2 py-2 rounded-lg text-left transition-colors",
                        selectedRepo?.id === repo.id
                          ? "bg-white dark:bg-gray-700 shadow-sm border border-cream-200 dark:border-gray-600"
                          : "hover:bg-cream-200/50 dark:hover:bg-gray-700/50"
                      )}
                    >
                      <button
                        onClick={() => onSelectRepo?.(repo)}
                        className="flex-1 flex items-center gap-3 min-w-0"
                      >
                        <Book className="w-4 h-4 text-claude-gray dark:text-gray-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate dark:text-gray-100">{repo.name}</div>
                          <div className="text-xs text-claude-gray dark:text-gray-400 truncate">
                            {repo.full_name}
                          </div>
                        </div>
                        {repo.private && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-cream-200 dark:bg-gray-600 rounded text-claude-gray dark:text-gray-300 shrink-0">
                            Private
                          </span>
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onTogglePin?.(repo.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-cream-200 dark:hover:bg-gray-600 rounded transition-all shrink-0"
                        title={isPinned ? "Unpin" : "Pin"}
                      >
                        {isPinned ? (
                          <Pin className="w-3 h-3 text-claude-orange" />
                        ) : (
                          <PinOff className="w-3 h-3 text-claude-gray dark:text-gray-400" />
                        )}
                      </button>
                    </div>
                  )
                })}
                {!showAll && filteredRepos && filteredRepos.length > 10 && (
                  <button
                    onClick={() => setShowAll(true)}
                    className="w-full text-center text-xs text-claude-gray dark:text-gray-400 py-1 hover:text-claude-dark dark:hover:text-gray-200"
                  >
                    Show {filteredRepos.length - 10} more...
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div>
            <div className="text-xs font-medium text-claude-gray dark:text-gray-400 uppercase tracking-wider mb-2 px-2 flex items-center gap-1.5">
              <Bell className="w-3 h-3" />
              <span>Recent Activity</span>
            </div>
            {webhookEventsLoading ? (
              <div className="flex items-center gap-2 px-2 py-3 text-claude-gray dark:text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading activity...</span>
              </div>
            ) : webhookEvents.length === 0 ? (
              <div className="px-2 py-3 text-xs text-claude-gray dark:text-gray-400">
                No recent activity.
              </div>
            ) : (
              <div className="space-y-0.5">
                {webhookEvents.map((event) => {
                  const Icon = getEventIcon(event)
                  return (
                    <button
                      key={event.id}
                      onClick={() => onSelectEvent?.(event)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors",
                        !event.read
                          ? "bg-white dark:bg-gray-700 shadow-sm border border-cream-200 dark:border-gray-600"
                          : "hover:bg-cream-200/50 dark:hover:bg-gray-700/50"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-4 h-4 shrink-0",
                          event.eventType === "workflow_run" && event.action === "success"
                            ? "text-emerald-500"
                            : event.eventType === "workflow_run" && event.action === "failure"
                            ? "text-red-500"
                            : "text-claude-gray dark:text-gray-400"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate dark:text-gray-100">
                          {getEventDisplayText(event)}
                        </div>
                        <div className="text-xs text-claude-gray dark:text-gray-400">
                          {formatRelativeTime(event.createdAt)}
                        </div>
                      </div>
                      {!event.read && (
                        <div className="w-2 h-2 rounded-full bg-claude-orange shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

        </div>

        <div className="p-3 border-t border-cream-200 dark:border-gray-700 space-y-1">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-cream-200/50 dark:hover:bg-gray-700/50 transition-colors text-left"
          >
            {resolvedTheme === "dark" ? (
              <Sun className="w-4 h-4 text-claude-gray dark:text-gray-400" />
            ) : (
              <Moon className="w-4 h-4 text-claude-gray dark:text-gray-400" />
            )}
            <span className="text-sm dark:text-gray-100">
              {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
            </span>
          </button>
          <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-cream-200/50 dark:hover:bg-gray-700/50 transition-colors text-left">
            <Settings className="w-4 h-4 text-claude-gray dark:text-gray-400" />
            <span className="text-sm dark:text-gray-100">Settings</span>
          </button>
          <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-cream-200/50 dark:hover:bg-gray-700/50 transition-colors text-left">
            <User className="w-4 h-4 text-claude-gray dark:text-gray-400" />
            <span className="text-sm dark:text-gray-100">Profile</span>
          </button>
        </div>
      </aside>

    </>
  )
}
