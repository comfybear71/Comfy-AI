# Handoff Log — Comfy-AI

---

## 2026-04-27 — Session: GitHub Agent Phase 1

**Branch:** `claude/github-agent-phase1`
**Status:** Merged, tagged `v0.4.0`, deployed
**Merged by:** comfybear71 (Stuart French)

### Work Done
- Installed `@octokit/rest` GitHub API client
- Added 6 new API routes for repo browsing, file reading, and PR creation
- Built `lib/github.ts` (Octokit wrapper) and `lib/prompts.ts`
- Updated sidebar with "Connect to GitHub" button and real repo list
- Added repo file browser panel, file viewer modal, and PR creation modal
- Injected `SYSTEM_PROMPT` env var as system message in chat API

### Files Changed
- `.env.example`, `package.json`, `package-lock.json`
- `app/api/chat/route.ts`
- `components/sidebar.tsx`, `components/chat/chat-interface.tsx`
- New: `app/api/github/**`, `components/file-viewer.tsx`, `components/pr-modal.tsx`, `lib/github.ts`, `lib/prompts.ts`

---

## 2026-04-27 — Session: GitHub Agent Phase 2

**Branch:** `claude/github-agent-phase2`
**Status:** Merged, tagged `v0.5.0`, deployed
**Merged by:** comfybear71 (Stuart French)

### Work Done
- Added workflow trigger + status API routes
- Built `components/pr-status-banner.tsx` with auto-polling (15s)
- Fixed mobile hamburger overlapping header logo
- Updated PR modal to return PR number for status tracking

### Files Changed
- `components/chat/chat-interface.tsx`
- `components/pr-modal.tsx`
- New: `app/api/github/repo/[owner]/[repo]/actions/route.ts`
- New: `app/api/github/repo/[owner]/[repo]/pr/[number]/status/route.ts`
- New: `components/pr-status-banner.tsx`

### Notes for Next Session
- Phase 3: GitHub App webhooks, auto-fix

---

## 2026-04-27 — Session: Dark Mode, Neon DB, Repo Pinning, LLM Safety

**Branch:** `claude/handoff-phase2`
**Status:** Merged, tagged `v0.6.0`, deployed
**Merged by:** comfybear71 (Stuart French)

### Work Done
- Dark mode toggle (light/dark/system) with Neon persistence
- Neon Postgres via Drizzle ORM (`user_prefs` table)
- Repo search/filter and pin/unpin, persisted to Neon
- LLM context safety: auto-trim messages to fit model limits
- Mobile hamburger positioning fix
- `/docs` scaffold: CLAUDE.md, SAFETY-RULES.md, PROMPTS.md

### Files Changed
- `app/layout.tsx`, `tailwind.config.ts`, `.env.example`
- `components/sidebar.tsx`, `components/theme-provider.tsx`
- `components/chat/chat-interface.tsx`, `app/api/chat/route.ts`
- New: `app/api/user/prefs/route.ts`, `lib/db.ts`, `lib/schema.ts`, `lib/tokens.ts`
- New: `docs/CLAUDE.md`, `docs/SAFETY-RULES.md`, `docs/PROMPTS.md`

---

## 2026-04-27 — Session: Dark Terminal Aesthetic

**Branch:** `claude/handoff-v0.6.0`
**Status:** Merged, tagged `v0.6.1`, deployed
**Merged by:** comfybear71 (Stuart French)

### Work Done
- Dark terminal aesthetic redesign across all chat components
- User messages align **right** with green bubble (`bg-emerald-600`)
- AI messages align **left** with dark bubble (`bg-[#161b22]`, `border-gray-700`)
- Active repo badge in header is now a green badge with cornered border
- Updated backgrounds to `#0d1117` / `#161b22` with emerald accents

### Files Changed
- `components/chat/message.tsx`
- `components/chat/message-list.tsx`
- `components/chat/chat-input.tsx`
- `components/chat/chat-interface.tsx`
- `components/file-viewer.tsx`
- `components/pr-modal.tsx`
- `components/pr-status-banner.tsx`

### Notes for Next Session
- Google Auth login (under Profile)
- Multi-screenshot upload (needs vision model on Ollama)
- Phase 3: GitHub App webhooks
