"use client"

import React, { useState } from "react"
import { X, GitPullRequest, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface PRModalProps {
  repo: { owner: string; repo: string; default_branch: string }
  suggestedChanges?: { path: string; content: string }[]
  onClose: () => void
  onSuccess?: (url: string) => void
}

export function PRModal({ repo, suggestedChanges, onClose, onSuccess }: PRModalProps) {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [branchName, setBranchName] = useState(`comfy-ai/${Date.now()}`)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async () => {
    if (!title.trim() || !branchName.trim()) return
    setIsSubmitting(true)
    setError("")

    try {
      const files =
        suggestedChanges?.map((f) => ({
          path: f.path,
          content: f.content,
          message: `Update ${f.path}`,
        })) || []

      const res = await fetch(`/api/github/repo/${repo.owner}/${repo.repo}/pr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim() || undefined,
          head: branchName.trim(),
          base: repo.default_branch,
          files,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to create PR")
      }

      onSuccess?.(data.url)
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-cream-200">
          <div className="flex items-center gap-2">
            <GitPullRequest className="w-5 h-5 text-claude-orange" />
            <h3 className="font-semibold text-claude-dark">Create Pull Request</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-cream-100 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-auto">
          <div>
            <label className="block text-sm font-medium text-claude-dark mb-1">Branch name</label>
            <input
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-cream-200 bg-cream-50 text-sm focus:outline-none focus:ring-2 focus:ring-claude-orange/20 focus:border-claude-orange/50"
              placeholder="feature/my-change"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-claude-dark mb-1">PR title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-cream-200 bg-cream-50 text-sm focus:outline-none focus:ring-2 focus:ring-claude-orange/20 focus:border-claude-orange/50"
              placeholder="Short description of the change"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-claude-dark mb-1">Description</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-cream-200 bg-cream-50 text-sm focus:outline-none focus:ring-2 focus:ring-claude-orange/20 focus:border-claude-orange/50 resize-none"
              placeholder="What changed and why"
            />
          </div>

          {suggestedChanges && suggestedChanges.length > 0 && (
            <div className="bg-cream-50 rounded-lg p-3 border border-cream-200">
              <p className="text-xs font-medium text-claude-dark mb-1">Files to change ({suggestedChanges.length})</p>
              <ul className="space-y-0.5">
                {suggestedChanges.map((f) => (
                  <li key={f.path} className="text-xs text-claude-gray font-mono">{f.path}</li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>
          )}
        </div>

        <div className="px-5 py-4 border-t border-cream-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-claude-dark hover:bg-cream-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !branchName.trim() || isSubmitting}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2",
              title.trim() && branchName.trim() && !isSubmitting
                ? "bg-claude-orange text-white hover:bg-claude-orange/90"
                : "bg-cream-200 text-claude-gray cursor-not-allowed"
            )}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Create PR
          </button>
        </div>
      </div>
    </div>
  )
}
