# Comfy-AI — Claude Developer Guide

## Universal Rules (ALWAYS apply first)

Before any work, read and follow ALL rules at:
```
https://raw.githubusercontent.com/comfybear71/Master/master/docs/prompts/master-rules.md
```

Key highlights:
- Discuss before coding (Rule 1)
- NEVER delete CLAUDE.md, HANDOFF.md, SAFETY-RULES.md, README.md (Rule 2)
- Branch protection ACTIVE on master — use `claude/` prefix branches (Rule 3)
- Fix-spiral prevention: max 3 attempts, mandatory stop template on failure (Rule 4)
- Complete PR handoff with compare URL, title, description, squash instructions, tag proposal (Rule 5)

## Project-Specific Rules

### Tech Stack
- Next.js 14 (App Router)
- React 18 + TypeScript
- Tailwind CSS
- shadcn/ui patterns (cn, Button)
- Ollama API for LLM (streaming JSON)
- GitHub API via Octokit

### Architecture
- Server components by default, `"use client"` only when needed
- API routes in `app/api/` with standard Next.js pattern
- GitHub API routes: `app/api/github/...`
- Components: `components/ui/` for primitives, `components/chat/` for chat-specific
- Shared: `lib/github.ts`, `lib/prompts.ts`, `lib/utils.ts`

### Environment Variables (Vercel)
| Var | Required | Description |
|-----|----------|-------------|
| `OLLAMA_API_URL` | Yes | Your Ollama server URL |
| `OLLAMA_API_KEY` | Yes | Basic auth password for Caddy |
| `GITHUB_TOKEN` | For GitHub features | Fine-grained PAT |
| `SYSTEM_PROMPT` | Optional | Prepended as system message to every chat |

### Security
- NEVER log or expose `GITHUB_TOKEN`
- NEVER commit `.env` files
- Validate all route params (`owner`, `repo`, `path`)
- Use `encodeURIComponent` for dynamic URL segments

### Patterns
- Use `cn()` from `lib/utils.ts` for conditional class merging
- Lucide icons only (no custom SVG in new code)
- Stream Ollama responses through `ReadableStream`
- GitHub API errors → return `{ error: message }` with 500 status

### Testing (manual)
1. `npm run build` must pass before pushing
2. Test GitHub flow: Connect → browse repo → view file → create PR
3. Test on mobile: hamburger, sidebar, file browser

### What NOT to do
- Don't add new dependencies without asking
- Don't change Ollama streaming protocol without discussion
- Don't remove existing demo chats (keep alongside GitHub features)
