# TODO: Wire GitHub tools into all providers

**Status:** Helper module `lib/github-tools.ts` already merged to master.
Not yet imported or used anywhere.

## Goal
Enable GitHub actions (create_branch, read_file, update_file) on every
tool-capable model — not just Anthropic. Weak models stay disabled with
a clear "switch model" message instead of hallucinating success.

## Next steps for `app/api/chat/route.ts`
- [ ] Import `GITHUB_TOOLS`, `executeGitHubTool`, `TOOL_CAPABLE_MODELS` from `lib/github-tools.ts`
- [ ] Add OpenAI-format tool wrapper for Groq / xAI / Ollama Cloud
- [ ] Add tool loop to Groq handler
- [ ] Add tool loop to xAI (Grok) handler
- [ ] Add tool loop to Ollama Cloud handler
- [ ] Gate tools behind `TOOL_CAPABLE_MODELS` set
- [ ] For non-capable models, prepend a system message: "You cannot perform GitHub actions on this model — ask the user to switch to Claude, Grok 3, or Llama 3.3 70B."

## Tool-capable models (confirmed reliable)
- ✅ All Claude (Opus / Sonnet / Haiku 4.x) — already working
- ✅ Grok 3, Grok 3 Mini
- ✅ Groq `llama-3.3-70b-versatile`, `llama-3.1-70b-versatile`
- ✅ Ollama Cloud: `qwen3-coder:480b-cloud`, `deepseek-v3.1:671b-cloud`, `kimi-k2:1t-cloud`

## Disabled (hallucinate or can't tool-call)
- ❌ Groq `llama-3.1-8b-instant` (fast but unreliable with tools)
- ❌ Local Ollama small models: `llama3.2:3b`, `phi3:mini`, `codellama:7b`
- ❌ Vision-only models without tool support

## How to resume
1. Open a fresh chat at your desktop (so you can copy/paste long files)
2. Say: "Continue work from TODO-TOOLS.md — wire `lib/github-tools.ts` into `app/api/chat/route.ts`"
3. Paste the full contents of `app/api/chat/route.ts` into the chat
4. Comfy AI will create a new `claude/wire-tools-providers` branch and push the changes

## Test plan after wiring
1. Switch to Grok 3 → "create branch claude/test-grok" → verify on GitHub
2. Switch to Groq llama-3.3-70b → same test → verify on GitHub
3. Switch to llama-3.1-8b-instant → same request → verify clear refusal (no hallucination)
4. Switch to Claude Opus → confirm no regression
