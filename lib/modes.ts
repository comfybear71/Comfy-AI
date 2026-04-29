export type AppMode = "free" | "fast" | "expert" | "heavy"

export interface ModeDef {
  id: AppMode
  label: string
  sublabel: string       // shown under label in picker
  chatModel: string      // model used for the main chat response
  councilEnabled: boolean
  councilAgentModel: string // model used for planner + coder agents in council
}

export const MODES: ModeDef[] = [
  {
    id: "free",
    label: "Free",
    sublabel: "No cost",
    chatModel: "llama-3.3-70b-versatile",
    councilEnabled: false,
    councilAgentModel: "llama-3.3-70b-versatile",
  },
  {
    id: "fast",
    label: "Fast",
    sublabel: "Quick responses",
    chatModel: "grok-3-mini",
    councilEnabled: false,
    councilAgentModel: "grok-3-mini",
  },
  {
    id: "expert",
    label: "Expert",
    sublabel: "Thinks hard",
    chatModel: "grok-3",
    councilEnabled: true,
    councilAgentModel: "grok-3-mini",
  },
  {
    id: "heavy",
    label: "Heavy",
    sublabel: "Team of Experts",
    chatModel: "grok-3",
    councilEnabled: true,
    councilAgentModel: "grok-3",
  },
]

export const MODE_MAP: Record<AppMode, ModeDef> = Object.fromEntries(
  MODES.map((m) => [m.id, m])
) as Record<AppMode, ModeDef>

export const DEFAULT_MODE: AppMode = "fast"
