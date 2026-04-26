"use client"

import React from "react"
import { Plus, MessageSquare, Settings, User, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  chats: { id: string; title: string; date: string }[]
  activeChat: string | null
  onNewChat: () => void
  onSelectChat: (id: string) => void
}

export function Sidebar({
  isOpen,
  onToggle,
  chats,
  activeChat,
  onNewChat,
  onSelectChat,
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

        <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin">
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
