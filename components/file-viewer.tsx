"use client"

import React from "react"
import { X, Copy, Check, FileCode, GitBranch } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileViewerProps {
  file: {
    name: string
    path: string
    content: string
    html_url: string
  } | null
  repo?: { owner: string; repo: string; default_branch: string }
  onClose: () => void
  onCopyToChat?: (content: string) => void
}

export function FileViewer({ file, repo, onClose, onCopyToChat }: FileViewerProps) {
  const [copied, setCopied] = React.useState(false)

  if (!file) return null

  const handleCopyContent = async () => {
    await navigator.clipboard.writeText(file.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyToChat = () => {
    const context = `File: ${file.path}${repo ? ` (${repo.owner}/${repo.repo})` : ""}\n\n\`\`\`\n${file.content}\n\`\`\``
    onCopyToChat?.(context)
  }

  const extension = file.name.split(".").pop() || ""
  const languageMap: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    py: "python",
    md: "markdown",
    json: "json",
    css: "css",
    html: "html",
    yaml: "yaml",
    yml: "yaml",
    sh: "bash",
    go: "go",
    rs: "rust",
    java: "java",
    rb: "ruby",
  }
  const language = languageMap[extension] || extension

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-[#161b22] rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div className="flex items-center gap-2 min-w-0">
            <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-sm font-medium truncate text-gray-100">{file.path}</span>
            {repo && (
              <span className="text-xs text-gray-400 flex items-center gap-1 shrink-0">
                <GitBranch className="w-3 h-3" />
                {repo.default_branch}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopyToChat}
              className="px-3 py-1.5 text-xs font-medium text-gray-100 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Copy to chat
            </button>
            <button
              onClick={handleCopyContent}
              className="p-1.5 text-gray-400 hover:text-gray-100 hover:bg-gray-700 rounded-lg transition-colors"
              title="Copy content"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-100 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-0 bg-[#0d1117]">
          <pre className="text-sm font-mono leading-relaxed p-4">
            <code className={cn("hljs", language && `language-${language}`)} style={{ background: "transparent", padding: 0 }}>
              {file.content.split("\n").map((line, i) => (
                <div key={i} className="table-row">
                  <span className="table-cell text-right pr-4 text-gray-500 select-none w-12">{i + 1}</span>
                  <span className="table-cell whitespace-pre text-gray-100">{line || " "}</span>
                </div>
              ))}
            </code>
          </pre>
        </div>
      </div>
    </div>
  )
}
