"use client"

import React, { useState, useRef, useEffect, memo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import { Copy, Check, Bot, CornerDownRight } from "lucide-react"
import { cn } from "@/lib/utils"

const TRUNCATE_HEIGHT = 420

function extractText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(extractText).join("")
  if (React.isValidElement(node)) return extractText((node.props as any).children)
  return ""
}

const MODEL_NAME_MAP: Record<string, string> = {
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

function shortenModelName(id: string): string {
  return MODEL_NAME_MAP[id] || id
}

// ── Code block ───────────────────────────────────────────────────────────────

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
    <div className="my-4 rounded-xl overflow-hidden border border-gray-700/80">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-b border-gray-700/60">
        <span className="text-[11px] px-2 py-0.5 bg-emerald-500/15 text-emerald-400 rounded-md font-mono font-semibold border border-emerald-500/20">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-200 transition-colors px-2 py-1 rounded-md hover:bg-gray-700/50"
        >
          {copied ? (
            <><Check className="w-3.5 h-3.5 text-emerald-400" />Copied</>
          ) : (
            <><Copy className="w-3.5 h-3.5" />Copy</>
          )}
        </button>
      </div>
      <pre className="!mt-0 !rounded-t-none bg-[#0d1117] !p-4 overflow-x-auto text-sm leading-relaxed">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    </div>
  )
}

// ── Table ────────────────────────────────────────────────────────────────────

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
    <div className="my-4 space-y-3">
      <div className="hidden sm:block border border-gray-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          {tableHead && (
            <thead className="bg-[#0d1117] border-b border-gray-700">
              {tableHead.props.children}
            </thead>
          )}
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
                  {copiedCell === valueText
                    ? <><Check className="w-3 h-3" />Copied!</>
                    : <><Copy className="w-3 h-3" />Copy</>
                  }
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Markdown component renderers ─────────────────────────────────────────────

const mdComponents = {
  pre:        ({ children }: any) => <>{children}</>,
  code:       CodeBlock,
  table:      Table,
  h1:         ({ children }: any) => <h1 className="text-[1.6rem] font-bold text-gray-100 mt-7 mb-3 leading-tight tracking-tight">{children}</h1>,
  h2:         ({ children }: any) => <h2 className="text-[1.35rem] font-semibold text-gray-100 mt-6 mb-2.5 leading-tight">{children}</h2>,
  h3:         ({ children }: any) => <h3 className="text-lg font-semibold text-gray-200 mt-5 mb-2 leading-snug">{children}</h3>,
  h4:         ({ children }: any) => <h4 className="text-base font-semibold text-gray-200 mt-4 mb-1.5">{children}</h4>,
  p:          ({ children }: any) => <p className="text-[15px] text-gray-200 leading-[1.75] mb-3 last:mb-0">{children}</p>,
  ul:         ({ children }: any) => <ul className="my-3 space-y-1.5 pl-5 list-disc marker:text-emerald-400">{children}</ul>,
  ol:         ({ children }: any) => <ol className="my-3 space-y-1.5 pl-5 list-decimal marker:text-emerald-400">{children}</ol>,
  li:         ({ children }: any) => <li className="text-[15px] text-gray-200 leading-[1.75] pl-1">{children}</li>,
  a:          ({ href, children }: any) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors">{children}</a>,
  strong:     ({ children }: any) => <strong className="font-semibold text-gray-100">{children}</strong>,
  em:         ({ children }: any) => <em className="italic text-gray-300">{children}</em>,
  blockquote: ({ children }: any) => <blockquote className="border-l-4 border-emerald-500/40 pl-4 my-3 text-gray-400 italic">{children}</blockquote>,
  hr:         () => <hr className="border-gray-700/60 my-5" />,
  thead:      ({ children }: any) => <thead className="bg-[#0d1117]">{children}</thead>,
  th:         ({ children }: any) => <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-700">{children}</th>,
  td:         ({ children }: any) => <td className="px-4 py-2.5 text-sm text-gray-300 border-b border-gray-700/40">{children}</td>,
}

const MemoMarkdown = memo(function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={mdComponents as any}
    >
      {content}
    </ReactMarkdown>
  )
})

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MessageProps {
  id: string
  role: "user" | "assistant"
  content: string
  images?: string[]
  timestamp?: string
  isStreaming?: boolean
  modelName?: string
  suggestions?: string[]
  onSuggest?: (text: string) => void
}

// ── Message component ─────────────────────────────────────────────────────────

export function Message({
  role, content, images, timestamp, isStreaming, modelName, suggestions, onSuggest,
}: MessageProps) {
  const isUser = role === "user"
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isStreaming) return
    const el = contentRef.current
    if (el) setOverflows(el.scrollHeight > TRUNCATE_HEIGHT + 20)
  }, [content, isStreaming])

  // ── User bubble ──────────────────────────────────────────────────────────────
  if (isUser) {
    return (
      <div className="flex justify-end px-3 py-2">
        <div className="max-w-[78%] sm:max-w-[62%]">
          {images && images.length > 0 && (
            <div className="flex gap-2 mb-2 flex-wrap justify-end">
              {images.map((img, idx) => (
                <img
                  key={idx}
                  src={`data:image/png;base64,${img}`}
                  alt={`Upload ${idx + 1}`}
                  className="h-24 w-24 object-cover rounded-xl border border-gray-700"
                />
              ))}
            </div>
          )}
          <div className="bg-emerald-600 text-white px-4 py-3 rounded-2xl rounded-br-md text-[15px] leading-relaxed whitespace-pre-wrap shadow-sm">
            {content}
          </div>
          {timestamp && (
            <p className="text-[10px] text-gray-600 text-right mt-1 pr-1">{timestamp}</p>
          )}
        </div>
      </div>
    )
  }

  // ── AI response ──────────────────────────────────────────────────────────────
  return (
    <div className="flex gap-3 px-3 py-3">
      <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="w-4 h-4 text-emerald-400" />
      </div>

      <div className="flex-1 min-w-0">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-sm font-semibold text-gray-100">Comfy AI</span>
          {modelName && (
            <span className="text-[11px] text-gray-500 font-medium bg-gray-800 px-1.5 py-0.5 rounded-md">
              {shortenModelName(modelName)}
            </span>
          )}
          {timestamp && (
            <span className="text-[10px] text-gray-600">{timestamp}</span>
          )}
        </div>

        {/* Content */}
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
              className={cn("relative overflow-hidden transition-[max-height] duration-300")}
              style={!expanded && overflows ? { maxHeight: TRUNCATE_HEIGHT } : undefined}
            >
              <MemoMarkdown content={content} />
              {!expanded && overflows && (
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#0d1117] to-transparent pointer-events-none" />
              )}
            </div>

            {overflows && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
              >
                {expanded ? "Show less ↑" : "Show more ↓"}
              </button>
            )}

            {/* Follow-up suggestion chips */}
            {suggestions && suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-700/40">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => onSuggest?.(s)}
                    className="flex items-center gap-1.5 px-3 py-2 text-[13px] text-gray-300 bg-[#161b22] border border-gray-700 rounded-xl hover:border-emerald-500/50 hover:text-gray-100 hover:bg-[#1c2129] transition-all text-left leading-snug"
                  >
                    <CornerDownRight className="w-3 h-3 text-gray-500 shrink-0" />
                    {s}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
