"use client"

import React from "react"
import {
  Plus,
  MessageSquare,
  Settings,
  User,
  Menu,
  X,
  Github,
  Book,
  FileCode,
  ChevronRight,
  FolderOpen,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface GitHubRepoItem {
  id: number
  name: string
  full_name: string
  description: string | null
  private: boolean
  default_branch: string
  owner: { login: string; avatar_url: string }
}

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  chats: { id: string; title: string; date: string }[]
  activeChat: string | null
  onNewChat: () => void
  onSelectChat: (id: string) => void
  githubConnected?: boolean
  repos?: GitHubRepoItem[]
  reposLoading?: boolean
  reposError?: string | null
  selectedRepo?: GitHubRepoItem | null
  onConnectGitHub?: () => void
  onSelectRepo?: (repo: GitHubRepoItem) => void
}

export function Sidebar({
  isOpen,
  onToggle,
  chats,
  activeChat,
  onNewChat,
  onSelectChat,
  githubConnected,
  repos,
  reposLoading,
  reposError,
  selectedRepo,
  onConnectGitHub,
  onSelectRepo,
}: SidebarProps) {
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
          "fixed lg:static inset-y-0 left-0 z-50 w-72 bg-[#f5f5f0] border-r border-cream-200 flex flex-col transform transition-transform duration-200 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:hidden"
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
            <span className="font-semibold text-lg tracking-tight">Comfy AI</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="lg:hidden"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="px-3 mb-2">
          <Button
            onClick={onNewChat}
            className="w-full justify-start gap-2 bg-white border border-cream-200 hover:bg-cream-100 text-claude-dark shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin space-y-4">
          {/* GitHub Section */}
          <div>
            <div className="text-xs font-medium text-claude-gray uppercase tracking-wider mb-2 px-2 flex items-center justify-between">
              <span>GitHub</span>
            </div>

            {!githubConnected ? (
              <button
                onClick={onConnectGitHub}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors bg-white border border-cream-200 hover:border-claude-orange/30 shadow-sm"
              >
                <Github className="w-4 h-4 text-claude-dark shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">Connect to GitHub</div>
                  <div className="text-xs text-claude-gray">Browse repos and create PRs</div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-claude-gray shrink-0" />
              </button>
            ) : reposLoading ? (
              <div className="flex items-center gap-2 px-2 py-3 text-claude-gray">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading repos...</span>
              </div>
            ) : reposError ? (
              <div className="flex items-start gap-2 px-2 py-3 text-red-600 bg-red-50 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="text-xs">{reposError}</span>
              </div>
            ) : (
              <div className="space-y-0.5">
                {repos?.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => onSelectRepo?.(repo)}
                    className={cn(
                      "w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors",
                      selectedRepo?.id === repo.id
                        ? "bg-white shadow-sm border border-cream-200"
                        : "hover:bg-cream-200/50"
                    )}
                  >
                    <Book className="w-4 h-4 text-claude-gray shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{repo.name}</div>
                      <div className="text-xs text-claude-gray truncate">
                        {repo.full_name}
                      </div>
                    </div>
                    {repo.private && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-cream-200 rounded text-claude-gray shrink-0">
                        Private
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Recent Chats */}
          <div>
            <div className="text-xs font-medium text-claude-gray uppercase tracking-wider mb-2 px-2">
              Recent
            </div>
            <div className="space-y-0.5">
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => onSelectChat(chat.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors",
                    activeChat === chat.id
                      ? "bg-white shadow-sm border border-cream-200"
                      : "hover:bg-cream-200/50"
                  )}
                >
                  <MessageSquare className="w-4 h-4 text-claude-gray shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{chat.title}</div>
                    <div className="text-xs text-claude-gray">{chat.date}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-cream-200 space-y-1">
          <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-cream-200/50 transition-colors text-left">
            <Settings className="w-4 h-4 text-claude-gray" />
            <span className="text-sm">Settings</span>
          </button>
          <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-cream-200/50 transition-colors text-left">
            <User className="w-4 h-4 text-claude-gray" />
            <span className="text-sm">Profile</span>
          </button>
        </div>
      </aside>

      {/* Mobile toggle button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className={cn(
          "fixed top-4 left-4 z-30 lg:hidden bg-white/80 backdrop-blur-sm border border-cream-200 shadow-sm",
          isOpen && "hidden"
        )}
      >
        <Menu className="w-5 h-5" />
      </Button>
    </>
  )
}
