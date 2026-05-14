export interface RecentSession {
  date: string          // ISO date string
  summary: string       // 1-2 sentence description of what was discussed
  messageCount: number
}

export interface FeedbackEntry {
  messageId: string
  vote: "up" | "down"
  snippet: string       // first 80 chars of the AI response
  date: string
}

export interface MemoryData {
  names: string[]           // known aliases
  preferredName: string     // what to greet them with
  activeProjects: string[]  // current projects being worked on
  facts: string[]           // learned facts: preferences, corrections, context
  recentSessions?: RecentSession[]
  feedbackLog?: FeedbackEntry[]
}

export const DEFAULT_MEMORY: MemoryData = {
  names: ["Comfy", "Mr. Scientist", "The Architect"],
  preferredName: "The Architect",
  activeProjects: [],
  facts: [],
  recentSessions: [],
  feedbackLog: [],
}

export function buildMemoryContext(memory: MemoryData): string {
  const lines: string[] = [
    `You are a personal AI assistant for ${memory.preferredName} (also known as ${memory.names.join(", ")}).`,
    `Address them as "${memory.preferredName}" unless they indicate otherwise.`,
    `This assistant exists solely to help them with their personal projects — be direct, efficient, and treat them as an expert.`,
  ]

  if (memory.activeProjects.length > 0) {
    lines.push(`\nCurrent active projects: ${memory.activeProjects.join(", ")}.`)
  }

  if (memory.facts.length > 0) {
    lines.push(`\nLearned preferences and context:`)
    memory.facts.forEach((f) => lines.push(`- ${f}`))
  }

  const sessions = memory.recentSessions ?? []
  if (sessions.length > 0) {
    lines.push(`\nRecent session history (for continuity):`)
    sessions.slice(0, 3).forEach((s) => {
      const d = new Date(s.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })
      lines.push(`- ${d}: ${s.summary}`)
    })
  }

  const feedback = memory.feedbackLog ?? []
  if (feedback.length > 0) {
    const ups = feedback.filter((f) => f.vote === "up").length
    const downs = feedback.filter((f) => f.vote === "down").length
    if (ups > 0 || downs > 0) {
      lines.push(`\nUser feedback on past responses: ${ups} positive, ${downs} negative.`)
      const recentDown = feedback.filter((f) => f.vote === "down").slice(-3)
      if (recentDown.length > 0) {
        lines.push(`Responses marked unhelpful recently — avoid similar patterns:`)
        recentDown.forEach((f) => lines.push(`- "${f.snippet}…"`))
      }
    }
  }

  return lines.join("\n")
}

export function getGreeting(name: string): string {
  const hour = new Date().getHours()
  if (hour < 5)  return `Working late, ${name}`
  if (hour < 12) return `Good morning, ${name}`
  if (hour < 17) return `Good afternoon, ${name}`
  if (hour < 21) return `Good evening, ${name}`
  return `Evening, ${name}`
}
