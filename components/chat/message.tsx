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
    <div className="relative group my-4 rounded-lg overflow-hidden border border-gray-700">
      <div className="flex items-center justify-between px-4 py-2 bg-[#0d1117] border-b border-gray-700">
        <span className="text-xs text-emerald-400 font-mono">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-emerald-400 transition-colors"
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
      <pre className="!mt-0 !rounded-t-none bg-[#0d1117]">
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
        "py-4",
        isUser ? "flex justify-end" : "flex justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl",
          isUser
            ? "bg-emerald-600 text-white rounded-br-md"
            : "bg-[#161b22] border border-gray-700 text-gray-100 rounded-bl-md"
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
              isUser ? "bg-emerald-700" : "bg-emerald-500/20"
            )}
          >
            {isUser ? (
              <User className="w-3 h-3 text-white" />
            ) : (
              <Bot className="w-3 h-3 text-emerald-400" />
            )}
          </div>
          <span className={cn("font-semibold text-xs", isUser ? "text-emerald-100" : "text-emerald-400")}>
            {isUser ? "You" : "Comfy AI"}
          </span>
          {timestamp && (
            <span className={cn("text-[10px]", isUser ? "text-emerald-200/60" : "text-gray-500")}>
              {timestamp}
            </span>
          )}
        </div>

        <div className="prose prose-sm max-w-none prose-invert">
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
  )
}
