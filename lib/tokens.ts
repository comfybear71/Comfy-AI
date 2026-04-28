// Rough token estimator: ~4 chars per token for English text
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export function estimateMessageTokens(messages: { role: string; content: string; images?: string[] }[]): number {
  return messages.reduce((sum, m) => sum + estimateTokens(m.content) + 4 + estimateImageTokens(m.images), 0)
}

// Images cost roughly 1000 tokens each in vision models
export function estimateImageTokens(images?: string[]): number {
  return (images?.length || 0) * 1000
}

const CONTEXT_LIMITS: Record<string, number> = {
  // Ollama — local models
  "llama3.1:8b": 131072,
  "llama3.1:70b": 131072,
  "llama3:8b": 8192,
  "codellama:7b": 16384,
  "codellama:13b": 16384,
  "llama3.2:3b": 131072,
  "llama3.2:1b": 131072,
  "llava:7b": 4096,
  "llava:13b": 4096,
  "llama3.2-vision": 131072,
  "moondream:1.8b": 2048,
  "bakllava": 4096,
  "mistral:7b": 32768,
  "mixtral:8x7b": 32768,
  "phi3:mini": 131072,
  "phi3:medium": 131072,
  "deepseek-coder:6.7b": 16384,
  "deepseek-coder-v2": 131072,
  "qwen2.5-coder:7b": 131072,
  "qwen3:8b": 131072,
  "gemma2:9b": 8192,
  "gemma2:27b": 8192,
  // Anthropic — Claude models
  "claude-opus-4-7": 200000,
  "claude-sonnet-4-6": 200000,
  "claude-haiku-4-5-20251001": 200000,
  "claude-opus-4-5": 200000,
  "claude-sonnet-4-5": 200000,
  // xAI — Grok models
  "grok-3": 131072,
  "grok-3-mini": 131072,
  "grok-2-vision-1212": 32768,
  "grok-2": 131072,
}

// Models that support image input
export const VISION_MODELS = new Set([
  "llava:7b",
  "llava:13b",
  "llama3.2-vision",
  "moondream:1.8b",
  "bakllava",
  "claude-opus-4-7",
  "claude-sonnet-4-6",
  "claude-haiku-4-5-20251001",
  "claude-opus-4-5",
  "claude-sonnet-4-5",
  "grok-2-vision-1212",
])

// Best fallback vision model per provider prefix
export function getBestVisionModel(currentModel: string): string {
  if (currentModel.startsWith("claude-")) return "claude-sonnet-4-6"
  if (currentModel.startsWith("grok-")) return "grok-2-vision-1212"
  return "llava:7b" // Ollama fallback
}

const SAFETY_MARGIN = 500

export function getContextLimit(model: string): number {
  return CONTEXT_LIMITS[model] || 8192
}

export function trimMessagesToFit(
  messages: { role: string; content: string; images?: string[] }[],
  model: string
): { trimmed: { role: string; content: string; images?: string[] }[]; wasTrimmed: boolean; estimatedTokens: number } {
  const limit = getContextLimit(model)
  const maxInputTokens = limit - SAFETY_MARGIN

  const estimated = estimateMessageTokens(messages)
  if (estimated <= maxInputTokens) {
    return { trimmed: messages, wasTrimmed: false, estimatedTokens: estimated }
  }

  const systemMessages = messages.filter((m) => m.role === "system")
  const nonSystem = messages.filter((m) => m.role !== "system")

  while (nonSystem.length > 1 && estimateMessageTokens([...systemMessages, ...nonSystem]) > maxInputTokens) {
    nonSystem.shift()
  }

  const trimmed = [...systemMessages, ...nonSystem]
  return {
    trimmed,
    wasTrimmed: true,
    estimatedTokens: estimateMessageTokens(trimmed),
  }
}
