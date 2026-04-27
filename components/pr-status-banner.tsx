"use client"

import React, { useEffect, useState, useCallback } from "react"
import {
  GitPullRequest,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface PRStatusBannerProps {
  owner: string
  repo: string
  number: number
  url: string
  onDismiss: () => void
}

interface CheckRun {
  name: string
  status: string
  conclusion: string | null
  html_url: string | null
}

interface PRStatus {
  pr: {
    number: number
    title: string
    state: string
    merged: boolean
    mergeable: boolean | null
    mergeable_state: string
    html_url: string
  }
  status: {
    state: string
    total_count: number
  }
  checks: CheckRun[]
}

export function PRStatusBanner({ owner, repo, number, url, onDismiss }: PRStatusBannerProps) {
  const [data, setData] = useState<PRStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/github/repo/${owner}/${repo}/pr/${number}/status`
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to fetch status")
      setData(json)
      setLastUpdated(new Date())
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [owner, repo, number])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 15000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  const overallState = data?.status.state || "pending"
  const allChecksComplete =
    data?.checks.every(
      (c) => c.status === "completed" || c.conclusion != null
    ) ?? false

  const statusIcon =
    overallState === "success" ? (
      <CheckCircle2 className="w-4 h-4 text-green-600" />
    ) : overallState === "failure" ? (
      <XCircle className="w-4 h-4 text-red-600" />
    ) : (
      <Clock className="w-4 h-4 text-amber-600" />
    )

  return (
    <div className="border-b border-cream-200 bg-cream-50">
      <div className="max-w-3xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <GitPullRequest className="w-4 h-4 text-claude-orange shrink-0" />
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-claude-dark hover:text-claude-orange truncate"
            >
              PR #{number} {data?.pr.title && `— ${data.pr.title}`}
            </a>
            <div className="flex items-center gap-1.5 shrink-0">
              {statusIcon}
              <span
                className={cn(
                  "text-xs font-medium capitalize",
                  overallState === "success" && "text-green-600",
                  overallState === "failure" && "text-red-600",
                  overallState === "pending" && "text-amber-600"
                )}
              >
                {overallState}
              </span>
              {loading && <Loader2 className="w-3 h-3 animate-spin text-claude-gray" />}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 hover:bg-cream-100 rounded-lg transition-colors"
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-claude-gray" />
              ) : (
                <ChevronDown className="w-4 h-4 text-claude-gray" />
              )}
            </button>
            <button
              onClick={onDismiss}
              className="p-1 hover:bg-cream-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-claude-gray" />
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-2 space-y-1">
            {error && (
              <div className="flex items-center gap-1.5 text-xs text-red-600">
                <AlertCircle className="w-3.5 h-3.5" />
                {error}
              </div>
            )}

            {data?.checks.length === 0 && !error && (
              <p className="text-xs text-claude-gray">No checks found yet.</p>
            )}

            {data?.checks.map((check) => (
              <div
                key={check.name}
                className="flex items-center justify-between py-1 px-2 bg-white rounded border border-cream-200"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {check.status !== "completed" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 shrink-0" />
                  ) : check.conclusion === "success" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                  ) : check.conclusion === "failure" ? (
                    <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-claude-gray shrink-0" />
                  )}
                  <span className="text-xs font-medium truncate">{check.name}</span>
                </div>
                <span className="text-[10px] text-claude-gray capitalize shrink-0">
                  {check.status === "completed"
                    ? check.conclusion || "done"
                    : check.status}
                </span>
              </div>
            ))}

            {lastUpdated && (
              <p className="text-[10px] text-claude-gray">
                Updated {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
