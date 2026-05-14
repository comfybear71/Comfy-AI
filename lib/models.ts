import { Brain, Code, Zap, Eye, Sparkles, Bot } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type Provider = "anthropic" | "xai" | "groq" | "deepseek" | "ollama-cloud"
export type Tier = "free" | "budget" | "standard" | "premium"

export interface ModelDef {
  id: string
  name: string
  description: string
  icon: LucideIcon
  provider: Provider
  vision: boolean
  tier: Tier
  inputPer1M?: number
  outputPer1M?: number
}

// ── Provider config — add new providers here, nowhere else ──────────────────
export interface ProviderConfig {
  endpoint: string
  apiKeyEnv: string
  label: string
}

export const PROVIDER_CONFIGS: Record<Provider, ProviderConfig> = {
  anthropic:      { endpoint: "https://api.anthropic.com/v1/messages",              apiKeyEnv: "ANTHROPIC_API_KEY",    label: "Anthropic — Claude"       },
  xai:            { endpoint: "https://api.x.ai/v1/chat/completions",               apiKeyEnv: "XAI_API_KEY",          label: "xAI — Grok"               },
  groq:           { endpoint: "https://api.groq.com/openai/v1/chat/completions",    apiKeyEnv: "GROQ_API_KEY",         label: "Groq — Cloud (free)"      },
  deepseek:       { endpoint: "https://api.deepseek.com/v1/chat/completions",       apiKeyEnv: "DEEPSEEK_API_KEY",     label: "DeepSeek — Direct API"    },
  "ollama-cloud": { endpoint: "https://ollama.com/v1/chat/completions",             apiKeyEnv: "OLLAMA_CLOUD_API_KEY", label: "Ollama — Cloud"           },
}

export const TIER_LABELS: Record<Tier, string> = {
  free:     "Free",
  budget:   "Budget",
  standard: "Standard",
  premium:  "Premium",
}

export const TIER_COLORS: Record<Tier, string> = {
  free:     "text-emerald-400",
  budget:   "text-sky-400",
  standard: "text-amber-400",
  premium:  "text-purple-400",
}

export const TIER_DOT: Record<Tier, string> = {
  free:     "bg-emerald-400",
  budget:   "bg-sky-400",
  standard: "bg-amber-400",
  premium:  "bg-purple-400",
}

export const MODELS: ModelDef[] = [
  // ── Groq (cloud · free) ─────────────────────────────────────────────────────
  { id: "llama-3.1-8b-instant",    name: "Llama 3.1 8B",     description: "Groq · 500+ tok/s · free",   icon: Zap,      provider: "groq",      vision: false, tier: "free"     },
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B",    description: "Groq · powerful · free",     icon: Brain,    provider: "groq",      vision: false, tier: "free"     },
  { id: "mixtral-8x7b-32768",      name: "Mixtral 8x7B",     description: "Groq · MoE · 32k ctx · free",icon: Brain,    provider: "groq",      vision: false, tier: "free"     },

  // ── DeepSeek (direct API · very cheap) ──────────────────────────────────────
  { id: "deepseek-chat",           name: "DeepSeek V3",      description: "Best value · 64k ctx",       icon: Code,     provider: "deepseek",  vision: false, tier: "budget",   inputPer1M: 0.14,  outputPer1M: 0.28  },
  { id: "deepseek-reasoner",       name: "DeepSeek R1",      description: "Chain-of-thought reasoning", icon: Brain,    provider: "deepseek",  vision: false, tier: "standard", inputPer1M: 0.55,  outputPer1M: 2.19  },

  // ── Anthropic (Claude) ───────────────────────────────────────────────────────
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", description: "Fast & cheap · 200k ctx", icon: Zap,      provider: "anthropic", vision: true,  tier: "budget",   inputPer1M: 0.25,  outputPer1M: 1.25  },
  { id: "claude-sonnet-4-6",         name: "Claude Sonnet 4",  description: "Balanced · 200k ctx",     icon: Sparkles, provider: "anthropic", vision: true,  tier: "standard", inputPer1M: 3,     outputPer1M: 15    },
  { id: "claude-opus-4-7",           name: "Claude Opus 4",    description: "Most capable · 200k ctx", icon: Sparkles, provider: "anthropic", vision: true,  tier: "premium",  inputPer1M: 5,     outputPer1M: 25    },

  // ── xAI (Grok) ──────────────────────────────────────────────────────────────
  { id: "grok-3-mini",              name: "Grok 3 Mini",      description: "Fast & cheap · 131k ctx",   icon: Zap,      provider: "xai",       vision: false, tier: "budget",   inputPer1M: 0.30,  outputPer1M: 0.50  },
  { id: "grok-3",                   name: "Grok 3",           description: "Capable · 131k ctx",        icon: Bot,      provider: "xai",       vision: false, tier: "standard", inputPer1M: 3,     outputPer1M: 15    },

  // ── Ollama Cloud (large open models) ────────────────────────────────────────
  { id: "deepseek-v3.1:671b-cloud", name: "DeepSeek V3.1 671B", description: "Massive · top coder",    icon: Code,     provider: "ollama-cloud", vision: false, tier: "standard", inputPer1M: 0.27, outputPer1M: 1.10  },
  { id: "qwen3-coder:480b-cloud",   name: "Qwen 3 Coder 480B",  description: "480B · code expert",     icon: Code,     provider: "ollama-cloud", vision: false, tier: "standard", inputPer1M: 0.50, outputPer1M: 2.00  },
  { id: "kimi-k2:1t-cloud",         name: "Kimi K2",             description: "1T params · reasoning", icon: Sparkles, provider: "ollama-cloud", vision: false, tier: "standard", inputPer1M: 0.60, outputPer1M: 2.50  },
]

export const PROVIDER_LABELS: Record<Provider, string> = Object.fromEntries(
  Object.entries(PROVIDER_CONFIGS).map(([k, v]) => [k, v.label])
) as Record<Provider, string>

export function getModel(id: string): ModelDef {
  return MODELS.find((m) => m.id === id) ?? MODELS[0]
}

export function getBestVisionModel(currentId: string): ModelDef {
  const current = getModel(currentId)
  if (current.vision) return current
  return (
    MODELS.find((m) => m.id === "claude-haiku-4-5-20251001") ??
    MODELS.find((m) => m.id === "claude-sonnet-4-6") ??
    MODELS.find((m) => m.vision) ??
    MODELS[0]
  )
}

export function estimateAgentCost(modelId: string): number {
  const m = getModel(modelId)
  if (!m.inputPer1M || !m.outputPer1M) return 0
  return (500 / 1_000_000) * m.inputPer1M + (300 / 1_000_000) * m.outputPer1M
}

export const DEFAULT_MODEL_ID = "llama-3.1-8b-instant"
export const COUNCIL_FALLBACK_MODEL = "grok-3-mini"

export const COUNCIL_DEFAULT_MODELS: Record<string, string> = {
  planner:  "grok-3-mini",
  coder:    "deepseek-chat",           // cheap + excellent coder
  reviewer: "llama-3.3-70b-versatile", // free
  security: "llama-3.3-70b-versatile", // free
  perf:     "llama-3.1-8b-instant",    // free · fastest
}
