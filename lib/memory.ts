export interface MemoryData {
  names: string[]           // known aliases
  preferredName: string     // what to greet them with
  activeProjects: string[]  // current projects being worked on
  facts: string[]           // learned facts: preferences, corrections, context
}

export const DEFAULT_MEMORY: MemoryData = {
  names: ["Comfy", "Mr. Scientist", "The Architect"],
  preferredName: "The Architect",
  activeProjects: [],
  facts: [],
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
