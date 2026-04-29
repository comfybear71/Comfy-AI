"use client"

import React, { useState, useRef, useEffect, memo, useMemo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import { Copy, Check, User, Bot } from "lucide-react"
import { cn } from "@/lib/utils"

const TRUNCATE_HEIGHT = 380

function extractText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(extractText).join("")
  if (React.isValidElement(node)) return extractText((node.props as any).children)
  return ""
}

export interface MessageProps {
  id: string
  role: "user" | "assistant"
  content: string
  images?: string[]
  timestamp?: string
  isStreaming?: boolean
}

function CodeBlock({ children, className, ...props }: any) {
  const [copied, setCopied] = useState(false)
  const code = extractText(children).replace(/\n$/, "")
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

const MemoMarkdown = memo(function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{ pre: ({ children }: any) => <>{children}</>, code: CodeBlock }}
    >
      {content}
    </ReactMarkdown>
  )
})

export function Message({ role, content, images, timestamp, isStreaming }: MessageProps) {
  const isUser = role === "user"
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isStreaming) return
    const el = contentRef.current
    if (el) setOverflows(el.scrollHeight > TRUNCATE_HEIGHT + 20)
  }, [content, isStreaming])

  return (
    <div className={cn("py-4", isUser ? "flex justify-end" : "flex justify-start")}>
      <div
        className={cn(
          "max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl",
          isUser
            ? "bg-emerald-600 text-white rounded-br-md"
            : "bg-[#161b22] border border-gray-700 text-gray-100 rounded-bl-md"
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0", isUser ? "bg-emerald-700" : "bg-emerald-500/20")}>
            {isUser ? <User className="w-3 h-3 text-white" /> : <Bot className="w-3 h-3 text-emerald-400" />}
          </div>
          <span className={cn("font-semibold text-xs", isUser ? "text-emerald-100" : "text-emerald-400")}>
            {isUser ? "You" : "Comfy AI"}
          </span>
          {timestamp && (
            <span className={cn("text-[10px]", isUser ? "text-emerald-200/60" : "text-gray-500")}>{timestamp}</span>
          )}
        </div>

        {images && images.length > 0 && (
          <div className="flex gap-2 mb-2 flex-wrap">
            {images.map((img, idx) => (
              <img
                key={idx}
                src={`data:image/png;base64,${img}`}
                alt={`Upload ${idx + 1}`}
                className="h-24 w-24 object-cover rounded-lg border border-gray-700"
              />
            ))}
          </div>
        )}

        {isStreaming && !content ? (
          <div className="flex gap-1 py-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400/40 animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 rounded-full bg-emerald-400/40 animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 rounded-full bg-emerald-400/40 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        ) : (
          <>
            <div
              ref={contentRef}
              className={cn(
                "relative prose prose-sm max-w-none prose-invert overflow-hidden transition-[max-height] duration-300",
                !expanded && overflows ? `max-h-[${TRUNCATE_HEIGHT}px]` : "max-h-none"
              )}
              style={!expanded && overflows ? { maxHeight: TRUNCATE_HEIGHT } : undefined}
            >
              <MemoMarkdown content={content} />

              {!expanded && overflows && (
                <div className={cn(
                  "absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t to-transparent pointer-events-none",
                  isUser ? "from-emerald-600" : "from-[#161b22]"
                )} />
              )}
            </div>

            {overflows && (
              <button
                onClick={() => setExpanded(!expanded)}
                className={cn(
                  "mt-2 text-xs flex items-center gap-1 ml-auto transition-colors",
                  isUser ? "text-emerald-200 hover:text-white" : "text-emerald-400 hover:text-emerald-300"
                )}
              >
                {expanded ? "Show less ↑" : "Show more ↓"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
