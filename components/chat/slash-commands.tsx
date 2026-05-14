"use client"

import React from "react"
import { cn } from "@/lib/utils"
import {
  Trash2, Cpu, HelpCircle, GitBranch, GitPullRequest, FileText,
} from "lucide-react"

export interface SlashCommand {
  name: string
  description: string
  usage: string
  icon: React.ElementType
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { name: "clear",  description: "Clear current conversation",       usage: "/clear",           icon: Trash2        },
  { name: "model",  description: "Switch model",                     usage: "/model <id>",      icon: Cpu           },
  { name: "repo",   description: "Switch active GitHub repo",        usage: "/repo <name>",     icon: GitBranch     },
  { name: "pr",     description: "Open create PR modal",             usage: "/pr",              icon: GitPullRequest},
  { name: "docs",   description: "Toggle project docs as context",   usage: "/docs",            icon: FileText      },
  { name: "help",   description: "Show available commands",          usage: "/help",            icon: HelpCircle    },
]

interface SlashMenuProps {
  query: string        // text after "/"
  onSelect: (command: SlashCommand) => void
  onDismiss: () => void
}

export function SlashMenu({ query, onSelect, onDismiss }: SlashMenuProps) {
  const filtered = SLASH_COMMANDS.filter(
    (c) => c.name.startsWith(query.toLowerCase()) || c.description.toLowerCase().includes(query.toLowerCase())
  )

  if (filtered.length === 0) return null

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onDismiss} />
      <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#161b22] border border-gray-700 rounded-xl shadow-xl z-40 overflow-hidden">
        <div className="px-3 py-1.5 border-b border-gray-700 text-[10px] text-gray-500 font-medium uppercase tracking-wider">
          Commands
        </div>
        {filtered.map((cmd) => {
          const Icon = cmd.icon
          return (
            <button
              key={cmd.name}
              onClick={() => onSelect(cmd)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-700/50 transition-colors text-left"
            >
              <Icon className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-mono text-gray-100">/{cmd.name}</span>
                <span className="ml-2 text-xs text-gray-500">{cmd.description}</span>
              </div>
              <span className="text-[10px] text-gray-600 font-mono shrink-0">{cmd.usage}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}

// Returns the command and its argument if a message is a slash command
export function parseSlashCommand(text: string): { command: string; arg: string } | null {
  const trimmed = text.trim()
  if (!trimmed.startsWith("/")) return null
  const [rawCmd, ...rest] = trimmed.slice(1).split(" ")
  const command = rawCmd.toLowerCase()
  if (!SLASH_COMMANDS.find((c) => c.name === command)) return null
  return { command, arg: rest.join(" ").trim() }
}
