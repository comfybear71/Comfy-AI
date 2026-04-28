// Rough token estimator: ~4 chars per token for English text
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export function estimateMessageTokens(messages: { role: string; content: string; images?: string[] }[]): number {
  return messages.reduce((sum, m) => sum + estimateTokens(m.content) + 4 + estimateImageTokens(m.images), 0) // +4 per message for role overhead
}

// Images cost roughly 1000 tokens each in vision models
export function estimateImageTokens(images?: string[]): number {
  return (images?.length || 0) * 1000
}

const CONTEXT_LIMITS: Record<string, number> = {
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
  "gemma2:9b": 8192,
  "gemma2:27b": 8192,
}

const SAFETY_MARGIN = 500 // tokens reserved for response

export function getContextLimit(model: string): number {
  return CONTEXT_LIMITS[model] || 8192
}

export function trimMessagesToFit(
  messages: { role: string; content: string; images?: string[] }[],
  model: string
): { trimmed: { role: string; content: string; images?: string[] }[]; wasTrimmed: boolean; estimatedTokens: number } {
  const limit = getContextLimit(model)
  const maxInputTokens = limit - SAFETY_MARGIN

  let estimated = estimateMessageTokens(messages)
  if (estimated <= maxInputTokens) {
    return { trimmed: messages, wasTrimmed: false, estimatedTokens: estimated }
  }

  // Start trimming from oldest messages (keep system messages + most recent)
  const systemMessages = messages.filter((m) => m.role === "system")
  const nonSystem = messages.filter((m) => m.role !== "system")

  // Keep removing oldest non-system messages until we fit
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
