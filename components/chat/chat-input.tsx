"use client"

import React, { useState, useRef, useEffect } from "react"
import { Send, Paperclip, X, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SlashMenu, parseSlashCommand, type SlashCommand } from "./slash-commands"

interface ChatInputProps {
  onSend: (message: string, images?: string[]) => void
  onCommand: (command: string, arg: string) => void
  onCouncil?: (task: string) => void
  isLoading?: boolean
}

const MAX_FILE_SIZE = 5 * 1024 * 1024
const MAX_IMAGES = 5

export function ChatInput({ onSend, onCommand, onCouncil, isLoading }: ChatInputProps) {
  const [input, setInput] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [attachError, setAttachError] = useState<string | null>(null)
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [slashQuery, setSlashQuery] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const adjustHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }

  useEffect(() => { adjustHeight() }, [input])

  const handleChange = (value: string) => {
    setInput(value)
    // Show slash menu when input starts with "/" with no space yet
    if (value.startsWith("/") && !value.includes(" ")) {
      setSlashQuery(value.slice(1))
      setShowSlashMenu(true)
    } else {
      setShowSlashMenu(false)
    }
  }

  const handleSubmit = () => {
    if ((!input.trim() && images.length === 0) || isLoading) return

    // @council trigger
    const trimmed = input.trim()
    if (trimmed.toLowerCase().startsWith("@council")) {
      const task = trimmed.replace(/^@council\s*/i, "").trim() || "analyze the current codebase"
      onCouncil?.(task)
      setInput("")
      setShowSlashMenu(false)
      return
    }

    const parsed = parseSlashCommand(input)
    if (parsed) {
      onCommand(parsed.command, parsed.arg)
      setInput("")
      setShowSlashMenu(false)
      return
    }

    onSend(input.trim(), images.length > 0 ? images : undefined)
    setInput("")
    setImages([])
    setAttachError(null)
    setShowSlashMenu(false)
    if (textareaRef.current) textareaRef.current.style.height = "auto"
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { setShowSlashMenu(false); return }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSlashSelect = (cmd: SlashCommand) => {
    setShowSlashMenu(false)
    if (cmd.name === "clear" || cmd.name === "pr" || cmd.name === "docs" || cmd.name === "help") {
      onCommand(cmd.name, "")
      setInput("")
    } else {
      // Commands that need an argument — fill prefix so user can type the arg
      setInput(`/${cmd.name} `)
      textareaRef.current?.focus()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    setAttachError(null)

    const remainingSlots = MAX_IMAGES - images.length
    if (remainingSlots <= 0) {
      setAttachError(`Maximum ${MAX_IMAGES} images per message`)
      return
    }

    const toProcess = Array.from(files).slice(0, remainingSlots)
    const errors: string[] = []

    toProcess.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        errors.push(`${file.name}: not an image`)
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: exceeds 5MB`)
        return
      }
      const reader = new FileReader()
      reader.onload = (ev) => {
        const result = ev.target?.result as string
        if (result) setImages((prev) => [...prev, result.split(",")[1] || result])
      }
      reader.readAsDataURL(file)
    })

    if (errors.length > 0) setAttachError(`Skipped: ${errors.join("; ")}`)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div className="border-t border-gray-700 bg-[#0d1117] p-4">
      <div className="max-w-3xl mx-auto relative">
        {/* Slash command menu */}
        {showSlashMenu && (
          <SlashMenu
            query={slashQuery}
            onSelect={handleSlashSelect}
            onDismiss={() => setShowSlashMenu(false)}
          />
        )}

        {/* Image previews */}
        {images.length > 0 && (
          <div className="flex gap-2 mb-2 flex-wrap">
            {images.map((img, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={`data:image/png;base64,${img}`}
                  alt={`Upload ${idx + 1}`}
                  className="h-16 w-16 object-cover rounded-lg border border-gray-700"
                />
                <button
                  onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative flex items-end gap-2 bg-[#161b22] rounded-2xl border border-gray-700 p-2 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500/50 transition-all">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-9 w-9 text-gray-400 hover:text-gray-100"
            title="Attach image"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="w-5 h-5" />
          </Button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Comfy AI… (/ for commands · @council for multi-agent)"
            rows={1}
            className="flex-1 resize-none bg-transparent border-0 p-2 text-base text-gray-100 focus:ring-0 focus-visible:ring-0 outline-none placeholder:text-gray-500 min-h-[40px] max-h-[200px]"
            disabled={isLoading}
          />

          <Button
            onClick={handleSubmit}
            disabled={(!input.trim() && images.length === 0) || isLoading}
            size="icon"
            className={cn(
              "shrink-0 h-9 w-9 rounded-xl transition-all",
              (input.trim() || images.length > 0)
                ? "bg-emerald-600 text-white hover:bg-emerald-500"
                : "bg-gray-700 text-gray-400"
            )}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {attachError && (
          <div className="flex items-center gap-1.5 mt-1.5 px-1">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <p className="text-xs text-red-400">{attachError}</p>
          </div>
        )}

        <p className="text-center text-xs text-gray-600 mt-2">
          Comfy AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  )
}
