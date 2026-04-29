import { Brain, Code, Zap, Eye, Sparkles, Bot } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type Provider = "ollama" | "anthropic" | "xai" | "groq" | "ollama-cloud"
export type Tier = "free" | "budget" | "standard" | "premium"

export interface ModelDef {
  id: string
  name: string
  description: string
  icon: LucideIcon
  provider: Provider
  vision: boolean
  tier: Tier
  inputPer1M?: number   // USD per 1M input tokens (omit for free/local)
  outputPer1M?: number  // USD per 1M output tokens
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
  // ── Ollama (local · free) ───────────────────────────────────────
  { id: "llama3.1:8b",        name: "Llama 3.1 8B",        description: "General purpose · 128k ctx",  icon: Brain,    provider: "ollama",       vision: false, tier: "free" },
  { id: "llama3.2:3b",        name: "Llama 3.2 3B",        description: "Fast & light · 128k ctx",     icon: Zap,      provider: "ollama",       vision: false, tier: "free" },
  { id: "codellama:7b",       name: "CodeLlama 7B",        description: "Code generation",              icon: Code,     provider: "ollama",       vision: false, tier: "free" },
  { id: "mistral:7b",         name: "Mistral 7B",          description: "Strong reasoning",             icon: Brain,    provider: "ollama",       vision: false, tier: "free" },
  { id: "deepseek-coder-v2",  name: "DeepSeek Coder V2",   description: "Expert coder · 128k ctx",     icon: Code,     provider: "ollama",       vision: false, tier: "free" },
  { id: "qwen2.5-coder:7b",   name: "Qwen 2.5 Coder 7B",  description: "Code + math",                  icon: Code,     provider: "ollama",       vision: false, tier: "free" },
  { id: "phi3:mini",          name: "Phi-3 Mini",          description: "Small but smart · 128k ctx",  icon: Zap,      provider: "ollama",       vision: false, tier: "free" },
  { id: "qwen3:8b",           name: "Qwen 3 8B",           description: "Reasoning + code · 128k ctx", icon: Brain,    provider: "ollama",       vision: false, tier: "free" },
  { id: "llava:7b",           name: "LLaVA 7B",            description: "Vision + language",           icon: Eye,      provider: "ollama",       vision: true,  tier: "free" },
  { id: "llama3.2-vision",    name: "Llama 3.2 Vision",    description: "Latest vision · 128k ctx",    icon: Eye,      provider: "ollama",       vision: true,  tier: "free" },
  { id: "moondream:1.8b",     name: "Moondream 1.8B",      description: "Tiny vision, very fast",      icon: Eye,      provider: "ollama",       vision: true,  tier: "free" },
  // ── Groq (cloud · free tier) ────────────────────────────────────
  { id: "llama-3.1-8b-instant",      name: "Llama 3.1 8B",     description: "Groq · 500+ tok/s free",  icon: Zap,      provider: "groq",         vision: false, tier: "free" },
  { id: "llama-3.3-70b-versatile",   name: "Llama 3.3 70B",    description: "Groq · powerful free",    icon: Brain,    provider: "groq",         vision: false, tier: "free" },
  { id: "mixtral-8x7b-32768",        name: "Mixtral 8x7B",     description: "Groq · MoE · 32k ctx",    icon: Brain,    provider: "groq",         vision: false, tier: "free" },
  // ── Anthropic (Claude) ──────────────────────────────────────────
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", description: "Fast & cheap · 200k ctx",  icon: Zap,      provider: "anthropic",    vision: true,  tier: "budget",   inputPer1M: 0.25,  outputPer1M: 1.25 },
  { id: "claude-sonnet-4-6",         name: "Claude Sonnet 4",  description: "Balanced · 200k ctx",      icon: Sparkles, provider: "anthropic",    vision: true,  tier: "standard", inputPer1M: 3,     outputPer1M: 15   },
  { id: "claude-opus-4-7",           name: "Claude Opus 4",    description: "Most capable · 200k ctx",  icon: Sparkles, provider: "anthropic",    vision: true,  tier: "premium",  inputPer1M: 5,     outputPer1M: 25   },
  // ── xAI (Grok) ──────────────────────────────────────────────────
  { id: "grok-3-mini",               name: "Grok 3 Mini",         description: "Fast & efficient · budget", icon: Zap,      provider: "xai",          vision: false, tier: "budget",   inputPer1M: 0.30,  outputPer1M: 0.50 },
  { id: "grok-3",                    name: "Grok 3",              description: "Capable · 131k ctx",       icon: Bot,      provider: "xai",          vision: false, tier: "standard", inputPer1M: 3,     outputPer1M: 15   },
  // ── Ollama Cloud ────────────────────────────────────────────────
  { id: "kimi-k2:1t-cloud",          name: "Kimi K2",           description: "1T params · reasoning",   icon: Sparkles, provider: "ollama-cloud", vision: false, tier: "standard", inputPer1M: 0.60,  outputPer1M: 2.50 },
  { id: "kimi-k2-thinking",          name: "Kimi K2 Thinking",  description: "Deep reasoning",           icon: Brain,    provider: "ollama-cloud", vision: false, tier: "standard", inputPer1M: 1.00,  outputPer1M: 3.00 },
  { id: "deepseek-v3.1:671b-cloud",  name: "DeepSeek V3.1",    description: "671B · top coder",         icon: Code,     provider: "ollama-cloud", vision: false, tier: "standard", inputPer1M: 0.27,  outputPer1M: 1.10 },
  { id: "qwen3-coder:480b-cloud",    name: "Qwen 3 Coder 480B", description: "480B · code expert",      icon: Code,     provider: "ollama-cloud", vision: false, tier: "standard", inputPer1M: 0.50,  outputPer1M: 2.00 },
  { id: "gpt-oss:20b-cloud",         name: "GPT OSS 20B",       description: "OpenAI open source",      icon: Bot,      provider: "ollama-cloud", vision: false, tier: "budget",   inputPer1M: 0.15,  outputPer1M: 0.60 },
  { id: "gpt-oss:120b-cloud",        name: "GPT OSS 120B",      description: "OpenAI OSS · large",      icon: Bot,      provider: "ollama-cloud", vision: false, tier: "standard", inputPer1M: 0.50,  outputPer1M: 2.00 },
]

export const PROVIDER_LABELS: Record<Provider, string> = {
  ollama:          "Ollama — Local Only (not available on web)",
  anthropic:       "Anthropic — Claude",
  xai:             "xAI — Grok",
  groq:            "Groq — Cloud (free)",
  "ollama-cloud":  "Ollama — Cloud",
}

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

/** Estimate cost for a single agent turn (~500 input + ~300 output tokens) */
export function estimateAgentCost(modelId: string): number {
  const m = getModel(modelId)
  if (!m.inputPer1M || !m.outputPer1M) return 0
  return (500 / 1_000_000) * m.inputPer1M + (300 / 1_000_000) * m.outputPer1M
}

export const DEFAULT_MODEL_ID = "llama-3.1-8b-instant"

// Smart council defaults by role (using confirmed-live model IDs)
export const COUNCIL_DEFAULT_MODELS: Record<string, string> = {
  planner:  "grok-3-mini",            // budget — fast reasoning via xAI
  coder:    "grok-3-mini",            // budget — code tasks via xAI
  reviewer: "llama-3.3-70b-versatile", // free — Groq
  security: "llama-3.3-70b-versatile", // free — Groq
  perf:     "llama-3.1-8b-instant",   // free — Groq fastest
}
