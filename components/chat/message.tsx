"use client"

import React, { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import { Copy, Check, User, Bot } from "lucide-react"
import { cn } from "@/lib/utils"

export interface MessageProps {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp?: string
}

function CodeBlock({ children, className, ...props }: any) {
  const [copied, setCopied] = useState(false)
  const code = String(children).replace(/\n$/, "")
  const language = className?.replace("language-", "") || "text"

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group my-4">
      <div className="flex items-center justify-between px-4 py-2 bg-[#e1e4e8] rounded-t-lg border-b border-[#d1d5da]">
        <span className="text-xs text-[#586069] font-mono">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-[#586069] hover:text-[#24292e] transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="!mt-0 !rounded-t-none">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    </div>
  )
}

export function Message({ role, content, timestamp }: MessageProps) {
  const isUser = role === "user"

  return (
    <div
      className={cn(
        "py-6",
        isUser ? "bg-white" : "bg-cream-50"
      )}
    >
      <div className="max-w-3xl mx-auto px-4 flex gap-4">
        <div className="shrink-0 mt-0.5">
          <div
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center",
              isUser
                ? "bg-claude-dark"
                : "bg-claude-orange"
            )}
          >
            {isUser ? (
              <User className="w-4 h-4 text-white" />
            ) : (
              <Bot className="w-4 h-4 text-white" />
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm">
              {isUser ? "You" : "Comfy AI"}
            </span>
            {timestamp && (
              <span className="text-xs text-claude-gray">
                {timestamp}
              </span>
            )}
          </div>

          <div className="prose prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                pre: ({ children }: any) => <>{children}</>,
                code: CodeBlock,
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  )
}
