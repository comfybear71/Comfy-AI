import { Brain, Code, Zap, Eye, Sparkles, Bot } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type Provider = "ollama" | "anthropic" | "xai" | "groq" | "ollama-cloud"

export interface ModelDef {
  id: string
  name: string
  description: string
  icon: LucideIcon
  provider: Provider
  vision: boolean
}

export const MODELS: ModelDef[] = [
  // ── Ollama (local) ──────────────────────────────────────────────
  { id: "llama3.1:8b",        name: "Llama 3.1 8B",        description: "General purpose · 128k ctx",  icon: Brain,    provider: "ollama",       vision: false },
  { id: "llama3.2:3b",        name: "Llama 3.2 3B",        description: "Fast & light · 128k ctx",     icon: Zap,      provider: "ollama",       vision: false },
  { id: "codellama:7b",       name: "CodeLlama 7B",        description: "Code generation",              icon: Code,     provider: "ollama",       vision: false },
  { id: "mistral:7b",         name: "Mistral 7B",          description: "Strong reasoning",             icon: Brain,    provider: "ollama",       vision: false },
  { id: "deepseek-coder-v2",  name: "DeepSeek Coder V2",   description: "Expert coder · 128k ctx",     icon: Code,     provider: "ollama",       vision: false },
  { id: "qwen2.5-coder:7b",   name: "Qwen 2.5 Coder 7B",  description: "Code + math",                  icon: Code,     provider: "ollama",       vision: false },
  { id: "phi3:mini",          name: "Phi-3 Mini",          description: "Small but smart · 128k ctx",  icon: Zap,      provider: "ollama",       vision: false },
  { id: "qwen3:8b",           name: "Qwen 3 8B",           description: "Reasoning + code · 128k ctx", icon: Brain,    provider: "ollama",       vision: false },
  { id: "llava:7b",           name: "LLaVA 7B",            description: "Vision + language",           icon: Eye,      provider: "ollama",       vision: true  },
  { id: "llama3.2-vision",    name: "Llama 3.2 Vision",    description: "Latest vision · 128k ctx",    icon: Eye,      provider: "ollama",       vision: true  },
  { id: "moondream:1.8b",     name: "Moondream 1.8B",      description: "Tiny vision, very fast",      icon: Eye,      provider: "ollama",       vision: true  },
  // ── Anthropic (Claude) ──────────────────────────────────────────
  { id: "claude-opus-4-7",           name: "Claude Opus 4",    description: "Most capable · 200k ctx",  icon: Sparkles, provider: "anthropic",    vision: true  },
  { id: "claude-sonnet-4-6",         name: "Claude Sonnet 4",  description: "Balanced · 200k ctx",      icon: Sparkles, provider: "anthropic",    vision: true  },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", description: "Fast & cheap · 200k ctx",  icon: Zap,      provider: "anthropic",    vision: true  },
  // ── xAI (Grok) ──────────────────────────────────────────────────
  { id: "grok-3",             name: "Grok 3",              description: "Most capable · 131k ctx",     icon: Bot,      provider: "xai",          vision: false },
  { id: "grok-3-mini",        name: "Grok 3 Mini",         description: "Fast & efficient",             icon: Zap,      provider: "xai",          vision: false },
  { id: "grok-2-vision-1212", name: "Grok 2 Vision",       description: "Vision capable",               icon: Eye,      provider: "xai",          vision: true  },
  // ── Groq (cloud · free tier) ────────────────────────────────────
  { id: "llama-3.1-8b-instant",      name: "Llama 3.1 8B",     description: "Groq · 500+ tok/s free",  icon: Zap,      provider: "groq",         vision: false },
  { id: "llama-3.3-70b-versatile",   name: "Llama 3.3 70B",    description: "Groq · powerful free",    icon: Brain,    provider: "groq",         vision: false },
  { id: "mixtral-8x7b-32768",        name: "Mixtral 8x7B",     description: "Groq · MoE · 32k ctx",    icon: Brain,    provider: "groq",         vision: false },
  // ── Ollama Cloud ────────────────────────────────────────────────
  { id: "kimi-k2:1t-cloud",          name: "Kimi K2",           description: "1T params · reasoning",   icon: Sparkles, provider: "ollama-cloud", vision: false },
  { id: "kimi-k2-thinking",          name: "Kimi K2 Thinking",  description: "Deep reasoning",           icon: Brain,    provider: "ollama-cloud", vision: false },
  { id: "deepseek-v3.1:671b-cloud",  name: "DeepSeek V3.1",    description: "671B · top coder",         icon: Code,     provider: "ollama-cloud", vision: false },
  { id: "qwen3-coder:480b-cloud",    name: "Qwen 3 Coder 480B", description: "480B · code expert",      icon: Code,     provider: "ollama-cloud", vision: false },
  { id: "gpt-oss:20b-cloud",         name: "GPT OSS 20B",       description: "OpenAI open source",      icon: Bot,      provider: "ollama-cloud", vision: false },
  { id: "gpt-oss:120b-cloud",        name: "GPT OSS 120B",      description: "OpenAI OSS · large",      icon: Bot,      provider: "ollama-cloud", vision: false },
]

export const PROVIDER_LABELS: Record<Provider, string> = {
  ollama:          "Ollama — Local",
  anthropic:       "Anthropic — Claude",
  xai:             "xAI — Grok",
  groq:            "Groq — Cloud",
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

export const DEFAULT_MODEL_ID = "llama3.1:8b"
