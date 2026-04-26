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
    <div className="border-t border-cream-200 bg-white p-4">
      <div className="max-w-3xl mx-auto">
        <div className="relative flex items-end gap-2 bg-cream-50 rounded-2xl border border-cream-200 p-2 focus-within:ring-2 focus-within:ring-claude-orange/20 focus-within:border-claude-orange/50 transition-all">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-9 w-9 text-claude-gray hover:text-claude-dark"
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
              "flex-1 resize-none bg-transparent border-0 p-2 text-base focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none placeholder:text-claude-gray/60 min-h-[40px] max-h-[200px]"
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
                ? "bg-claude-orange text-white hover:bg-claude-orange/90"
                : "bg-cream-200 text-claude-gray"
            )}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        <div className="text-center mt-2">
          <p className="text-xs text-claude-gray">
            Comfy AI can make mistakes. Please verify important information.
          </p>
        </div>
      </div>
    </div>
  )
}
