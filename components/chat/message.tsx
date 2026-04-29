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
  modelName?: string
}

function shortenModelName(modelId: string): string {
  // Extract the display name from model ID
  const nameMap: Record<string, string> = {
    "llama3.1:8b": "Llama 3.1 8B",
    "llama3.2:3b": "Llama 3.2 3B",
    "codellama:7b": "CodeLlama 7B",
    "mistral:7b": "Mistral 7B",
    "deepseek-coder-v2": "DeepSeek Coder V2",
    "qwen2.5-coder:7b": "Qwen 2.5 Coder",
    "phi3:mini": "Phi-3 Mini",
    "qwen3:8b": "Qwen 3 8B",
    "llava:7b": "LLaVA 7B",
    "llama3.2-vision": "Llama 3.2 Vision",
    "moondream:1.8b": "Moondream 1.8B",
    "claude-opus-4-7": "Claude Opus 4",
    "claude-sonnet-4-6": "Claude Sonnet 4",
    "claude-haiku-4-5-20251001": "Haiku 4.5",
    "grok-3": "Grok 3",
    "grok-3-mini": "Grok 3 Mini",
    "grok-4-1-fast-reasoning": "Grok 4.1 Fast",
    "grok-4-1-fast-non-reasoning": "Grok 4.1 Fast (lite)",
    "llama-3.1-8b-instant": "Llama 3.1 8B",
    "llama-3.3-70b-versatile": "Llama 3.3 70B",
    "mixtral-8x7b-32768": "Mixtral 8x7B",
    "kimi-k2:1t-cloud": "Kimi K2",
    "kimi-k2-thinking": "Kimi K2 Thinking",
    "deepseek-v3.1:671b-cloud": "DeepSeek V3.1",
    "qwen3-coder:480b-cloud": "Qwen 3 Coder 480B",
    "gpt-oss:20b-cloud": "GPT OSS 20B",
    "gpt-oss:120b-cloud": "GPT OSS 120B",
  }
  return nameMap[modelId] || modelId
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

function Table({ children }: any) {
  const [copiedCell, setCopiedCell] = useState<string | null>(null)

  const handleCopyCell = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedCell(text)
    setTimeout(() => setCopiedCell(null), 2000)
  }

  const tableBody = children?.find((child: any) => child?.type === "tbody")
  const tableHead = children?.find((child: any) => child?.type === "thead")

  if (!tableBody) {
    return (
      <div className="my-4 overflow-x-auto border border-gray-700 rounded-lg">
        <table className="w-full text-sm">{children}</table>
      </div>
    )
  }

  const rows = tableBody.props?.children || []

  return (
    <div className="my-4 space-y-3 !m-0">
      <div className="hidden sm:block border border-gray-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          {tableHead && <thead className="bg-[#0d1117] border-b border-gray-700">{tableHead.props.children}</thead>}
          <tbody>{rows}</tbody>
        </table>
      </div>
      <div className="sm:hidden space-y-3">
        {rows.map((row: any, idx: number) => {
          const cells = row.props?.children || []
          if (cells.length < 2) return null
          const fieldText = extractText(cells[0])
          const valueText = extractText(cells[1])
          return (
            <div key={idx} className="border border-gray-700 rounded-lg p-3 bg-[#0d1117]">
              <div className="text-xs font-bold text-emerald-400 mb-2 uppercase">{fieldText}</div>
              <div className="text-sm text-gray-200 break-words font-mono mb-2">{valueText}</div>
              {valueText && (
                <button
                  onClick={() => handleCopyCell(valueText)}
                  className="w-full text-xs text-gray-400 hover:text-emerald-400 transition-colors flex items-center justify-center gap-1 py-2 border border-gray-700 rounded-lg hover:border-emerald-400/50"
                >
                  {copiedCell === valueText ? <><Check className="w-3 h-3" />Copied!</> : <><Copy className="w-3 h-3" />Copy</>}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const MemoMarkdown = memo(function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{ pre: ({ children }: any) => <>{children}</>, code: CodeBlock, table: Table }}
    >
      {content}
    </ReactMarkdown>
  )
})

export function Message({ role, content, images, timestamp, isStreaming, modelName }: MessageProps) {
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
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0", isUser ? "bg-emerald-700" : "bg-emerald-500/20")}>
              {isUser ? <User className="w-3 h-3 text-white" /> : <Bot className="w-3 h-3 text-emerald-400" />}
            </div>
            <span className={cn("font-semibold text-xs", isUser ? "text-emerald-100" : "text-emerald-400")}>
              {isUser ? "You" : "Comfy AI"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            {!isUser && modelName && (
              <span className="text-gray-400">{shortenModelName(modelName)}</span>
            )}
            {timestamp && (
              <span className={cn(isUser ? "text-emerald-200/60" : "text-gray-500")}>{timestamp}</span>
            )}
          </div>
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
