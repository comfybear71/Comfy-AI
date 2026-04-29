"use client"

import { FileText, FilePen } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileOpBadgeProps {
  op: "reading" | "writing"
  filename: string
  className?: string
}

export function FileOpBadge({ op, filename, className }: FileOpBadgeProps) {
  const isRead = op === "reading"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border",
        isRead
          ? "bg-blue-500/10 text-blue-300 border-blue-500/30"
          : "bg-amber-500/10 text-amber-300 border-amber-500/30",
        className
      )}
    >
      {isRead ? <FileText className="w-3 h-3 shrink-0" /> : <FilePen className="w-3 h-3 shrink-0" />}
      <span className="hidden sm:inline">{isRead ? "Reading" : "Writing"}</span>
      <span className="truncate max-w-[160px]">{filename}</span>
    </span>
  )
}
