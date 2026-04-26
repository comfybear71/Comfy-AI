export function buildSystemPrompt(basePrompt?: string): string {
  const parts: string[] = []

  if (basePrompt?.trim()) {
    parts.push(basePrompt.trim())
  }

  parts.push(
    `You are a helpful coding assistant integrated with GitHub. You can browse repositories, read files, and help users create pull requests.

When referencing code:
- Use proper markdown code blocks with language tags
- Keep explanations concise and practical
- If suggesting changes, explain the "why" briefly

When a user mentions a repo, file, or PR, assume they want you to help with code changes unless they say otherwise.`
  )

  return parts.join("\n\n")
}
