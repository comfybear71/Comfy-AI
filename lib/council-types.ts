export type AgentId = "planner" | "coder" | "reviewer" | "security" | "perf" | "reflector"

export type AgentStatus =
  | "idle"
  | "thinking"
  | "reviewing"
  | "approved"
  | "needs-discussion"

// Hard state machine — enforces one-way flow, prevents loops
export type CouncilPhase =
  | "idle"
  | "planning"
  | "coding"
  | "reviewing"
  | "awaiting-human"
  | "reflecting"
  | "done"

export type CouncilEvent =
  | { event: "phase"; phase: CouncilPhase }
  | { event: "status"; agentId: AgentId; status: AgentStatus; detail?: string }
  | { event: "message"; agentId: AgentId; content: string }
  | { event: "file-op"; agentId: AgentId; op: "reading" | "writing"; filename: string }
  | { event: "vote"; agentId: AgentId; score: number; reasoning: string }
  | { event: "lesson"; content: string }
  | { event: "loop-detected"; lastSeen: number }
  | { event: "complete"; avgScore: number; plan: string }
  | { event: "error"; agentId: AgentId; message: string }

export interface FeedEntry {
  id: string
  agentId: AgentId
  type: "message" | "file-op" | "vote" | "lesson"
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

export interface CouncilLesson {
  id: number
  task: string
  lesson: string
  avgScore: string | null
  createdAt: Date
}
