"use client"

import React, { useState, useRef, useEffect } from "react"
import { Send, Paperclip } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  onSend: (message: string) => void
  isLoading?: boolean
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [input, setInput] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }

  useEffect(() => {
    adjustHeight()
  }, [input])

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return
    onSend(input.trim())
    setInput("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="border-t border-gray-700 bg-[#0d1117] p-4">
      <div className="max-w-3xl mx-auto">
        <div className="relative flex items-end gap-2 bg-[#161b22] rounded-2xl border border-gray-700 p-2 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500/50 transition-all">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-9 w-9 text-gray-400 hover:text-gray-100"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </Button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Comfy AI..."
            rows={1}
            className={cn(
              "flex-1 resize-none bg-transparent border-0 p-2 text-base text-gray-100 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none placeholder:text-gray-500 min-h-[40px] max-h-[200px]"
            )}
            disabled={isLoading}
          />

          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            size="icon"
            className={cn(
              "shrink-0 h-9 w-9 rounded-xl transition-all",
              input.trim()
                ? "bg-emerald-600 text-white hover:bg-emerald-500"
                : "bg-gray-700 text-gray-400"
            )}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        <div className="text-center mt-2">
          <p className="text-xs text-gray-500">
            Comfy AI can make mistakes. Please verify important information.
          </p>
        </div>
      </div>
    </div>
  )
}
