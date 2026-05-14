"use client"

import React, { useState, useRef, useEffect } from "react"
import { Send, Paperclip, X, AlertCircle, Mic, MicOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SlashMenu, parseSlashCommand, type SlashCommand } from "./slash-commands"
import { ModePicker } from "./mode-picker"
import type { AppMode } from "@/lib/modes"

interface ChatInputProps {
  onSend: (message: string, images?: string[]) => void
  onCommand: (command: string, arg: string) => void
  onCouncil?: (task: string) => void
  isLoading?: boolean
  mode: AppMode
  onModeChange: (mode: AppMode) => void
  droppedImages?: string[]
}

const MAX_FILE_SIZE = 5 * 1024 * 1024
const MAX_IMAGES = 5

export function ChatInput({ onSend, onCommand, onCouncil, isLoading, mode, onModeChange, droppedImages }: ChatInputProps) {
  const [input, setInput] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [attachError, setAttachError] = useState<string | null>(null)
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [slashQuery, setSlashQuery] = useState("")
  const [isListening, setIsListening] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)

  // Merge images dropped from outside (drag-and-drop on the chat area)
  useEffect(() => {
    if (droppedImages && droppedImages.length > 0) {
      setImages((prev) => [...prev, ...droppedImages].slice(0, MAX_IMAGES))
    }
  }, [droppedImages])

  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRec) {
      setAttachError("Voice input not supported in this browser")
      return
    }
    const rec = new SpeechRec()
    rec.continuous = false
    rec.interimResults = false
    rec.lang = "en-AU"
    rec.onresult = (e: any) => {
      const transcript: string = e.results[0][0].transcript
      setInput((prev) => prev ? `${prev} ${transcript}` : transcript)
      setIsListening(false)
    }
    rec.onerror = () => setIsListening(false)
    rec.onend = () => setIsListening(false)
    recognitionRef.current = rec
    rec.start()
    setIsListening(true)
  }

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
    if (value.startsWith("/") && !value.includes(" ")) {
      setSlashQuery(value.slice(1))
      setShowSlashMenu(true)
    } else {
      setShowSlashMenu(false)
    }
  }

  const handleSubmit = () => {
    if ((!input.trim() && images.length === 0) || isLoading) return

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
    if (cmd.name === "clear" || cmd.name === "pr" || cmd.name === "docs" || cmd.name === "help" || cmd.name === "improve" || cmd.name === "memory") {
      onCommand(cmd.name, "")
      setInput("")
    } else {
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
    <div className="border-t border-white/[0.06] bg-[#080b10] p-4">
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

        <div className="relative flex flex-col bg-[#0e1117] rounded-2xl border border-white/[0.08] input-glow transition-all">
          {/* Text area row */}
          <div className="flex items-end gap-2 p-2">
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
              placeholder="Message Comfy AI…"
              rows={1}
              className="flex-1 resize-none bg-transparent border-0 p-2 text-base text-gray-100 focus:ring-0 focus-visible:ring-0 outline-none placeholder:text-gray-500 min-h-[40px] max-h-[200px]"
              disabled={isLoading}
            />

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleVoice}
              title={isListening ? "Stop listening" : "Voice input"}
              className={cn(
                "shrink-0 h-9 w-9 transition-all",
                isListening
                  ? "text-red-400 animate-pulse"
                  : "text-gray-400 hover:text-gray-100"
              )}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>

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

          {/* Mode picker row — sits at bottom of input box */}
          <div className="flex items-center px-3 pb-2">
            <ModePicker mode={mode} onModeChange={onModeChange} />
          </div>
        </div>

        {attachError && (
          <div className="flex items-center gap-1.5 mt-1.5 px-1">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <p className="text-xs text-red-400">{attachError}</p>
          </div>
        )}

        <p className="text-center text-[11px] text-white/15 mt-2">
          Comfy AI · Personal Assistant
        </p>
      </div>
    </div>
  )
}
