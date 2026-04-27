# Comfy-AI — Safety Rules

## Master Rules Reference
All universal rules live in the Master repository:
```
https://raw.githubusercontent.com/comfybear71/Master/master/docs/prompts/master-rules.md
```

## Comfy-AI Specific

### 1. GitHub Token Protection
- `GITHUB_TOKEN` must be a **fine-grained PAT** with minimal scopes
- Store in Vercel env vars only (encrypted at rest)
- Never log token, never expose in client-side code
- If token leaks, revoke immediately and regenerate

### 2. API Rate Limits
- GitHub PAT: 5000 req/hour
- Ollama: depends on droplet capacity (~7GB RAM observed)
- Add caching if we hit limits

### 3. Branch Protection
- Master is protected in ALL repos
- Create `claude/` prefixed branches
- Owner (comfybear71) handles merges via browser

### 4. Sacred Files
Never alter or remove without explicit approval:
- `CLAUDE.md`
- `HANDOFF.md`
- `SAFETY-RULES.md`
- `README.md`
- `.env.example`

### 5. Mobile Safety
- UI must work on iPad and iPhone
- Touch targets ≥ 44px
- No hover-only interactions
- Test hamburger, modals, file browser on mobile

### 6. PR Creation Safety
- PR modal requires title + branch name
- Files array must contain valid paths
- Never overwrite existing files without confirmation
- Default base branch: repo's `default_branch`

### 7. System Prompt Boundaries
- `SYSTEM_PROMPT` env var is injected as-is into every chat
- User controls the content — we just prepend it
- If SYSTEM_PROMPT references external URLs, ensure they are accessible
