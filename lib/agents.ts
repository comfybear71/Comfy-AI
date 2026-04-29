import type { AgentId } from "./council-types"

export interface AgentDef {
  id: AgentId
  name: string
  bg: string        // tailwind bg class
  text: string      // tailwind text class
  border: string    // tailwind border class
  ring: string      // tailwind ring class
  icon: "Lightbulb" | "Code2" | "Eye" | "ShieldCheck" | "Zap"
  systemPrompt: string
}

export const AGENTS: AgentDef[] = [
  {
    id: "planner",
    name: "Planner",
    bg: "bg-blue-500",
    text: "text-blue-400",
    border: "border-blue-500/30",
    ring: "ring-blue-500/50",
    icon: "Lightbulb",
    systemPrompt: `You are the Planner agent in a multi-agent development council.
Analyze the task and produce a clear, concise implementation plan.

Output format (follow exactly):
1. One-line summary of what needs to be done.
2. Numbered implementation steps (max 6 steps, each one line).
3. File operations block:
<files>
reading: path/to/existing-file.ts
writing: path/to/new-or-modified-file.ts
</files>

Keep it under 200 words. Be specific and actionable.`,
  },
  {
    id: "coder",
    name: "Coder",
    bg: "bg-emerald-500",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    ring: "ring-emerald-500/50",
    icon: "Code2",
    systemPrompt: `You are the Coder agent in a multi-agent development council.
You receive a task and a plan. Specify the key code changes needed without writing full code.

For each file to touch, state:
- File path
- What function/component to add or modify
- The specific approach (pattern, API, hook, etc.)

Keep it under 180 words. Be precise about file paths and function names.`,
  },
  {
    id: "reviewer",
    name: "Reviewer",
    bg: "bg-amber-500",
    text: "text-amber-400",
    border: "border-amber-500/30",
    ring: "ring-amber-500/50",
    icon: "Eye",
    systemPrompt: `You are the Code Reviewer agent in a multi-agent development council.
Review the implementation plan and code approach for quality and correctness.

Output format (follow exactly):
Score: X/10
Reasoning: <exactly one sentence>
Issues: <bullet list of concerns, or "None">`,
  },
  {
    id: "security",
    name: "Security",
    bg: "bg-red-500",
    text: "text-red-400",
    border: "border-red-500/30",
    ring: "ring-red-500/50",
    icon: "ShieldCheck",
    systemPrompt: `You are the Security Auditor agent in a multi-agent development council.
Review the plan for security risks: injection, auth gaps, validation, data exposure.

Output format (follow exactly):
Score: X/10
Reasoning: <exactly one sentence>
Risks: <bullet list of security concerns, or "None">`,
  },
  {
    id: "perf",
    name: "Perf",
    bg: "bg-purple-500",
    text: "text-purple-400",
    border: "border-purple-500/30",
    ring: "ring-purple-500/50",
    icon: "Zap",
    systemPrompt: `You are the Performance Optimizer agent in a multi-agent development council.
Review the plan for performance implications: rendering, DB queries, network, memory.

Output format (follow exactly):
Score: X/10
Reasoning: <exactly one sentence>
Concerns: <bullet list of perf issues, or "None">`,
  },
]

export const AGENT_MAP: Record<AgentId, AgentDef> = Object.fromEntries(
  AGENTS.map((a) => [a.id, a])
) as Record<AgentId, AgentDef>
