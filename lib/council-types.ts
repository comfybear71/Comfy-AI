export type AgentId = "planner" | "coder" | "reviewer" | "security" | "perf"

export type AgentStatus =
  | "idle"
  | "thinking"
  | "reviewing"
  | "approved"
  | "needs-discussion"

export type CouncilEvent =
  | { event: "status"; agentId: AgentId; status: AgentStatus; detail?: string }
  | { event: "message"; agentId: AgentId; content: string }
  | { event: "file-op"; agentId: AgentId; op: "reading" | "writing"; filename: string }
  | { event: "vote"; agentId: AgentId; score: number; reasoning: string }
  | { event: "complete"; avgScore: number; plan: string }
  | { event: "error"; agentId: AgentId; message: string }

export interface FeedEntry {
  id: string
  agentId: AgentId
  type: "message" | "file-op" | "vote"
  content: string
  score?: number
  reasoning?: string
  op?: "reading" | "writing"
  filename?: string
}

export interface AgentState {
  status: AgentStatus
  score?: number
  reasoning?: string
}

export type AgentModels = Record<AgentId, string>
