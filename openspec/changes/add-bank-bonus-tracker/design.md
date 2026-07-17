# Design: Bank Bonus Tracker (Local)

## Context

Greenfield, empty repo. Personal-use, local-only web app. Earlier exploration considered Vercel + Supabase + Google auth; the user cut all of it: runs on their machine, single user, no login. Persistence must be automatic (no import/export). Extraction uses the user's DeepSeek key and should work with any OpenAI-compatible provider; web search rides on the user's Claude Max subscription via Claude Code headless mode.

## Goals / Non-Goals

**Goals:**
- Paste a bonus URL or text → LLM extracts structured fields → user confirms → saved.
- Auto-computed countdowns: days open, DD deadline, churn cooldown.
- Zero-effort persistence: everything in one SQLite file in the project directory.
- Any OpenAI-compatible LLM via settings (base URL + model + key); DeepSeek is the default.
- Churn-rule web search via Claude Code subprocess (subscription auth, WebSearch tool).
- Vitest suite passes locally; implementation parallelized across subagents.

**Non-Goals:**
- No auth, no multi-user, no cloud deployment, no Vercel/Supabase.
- No import/export UI (the .db file itself is the backup — copy it).
- No own scraping infrastructure beyond a plain server-side fetch of the pasted URL.
- No provider-specific SDKs — one OpenAI-compatible HTTP client covers DeepSeek/Kimi/Qwen/OpenRouter/Ollama.

## Decisions

**Stack: Next.js App Router + better-sqlite3, run locally.**
Alternatives: Vite+Express split (two processes, more glue); Electron (packaging overhead for a localhost tool). Next.js keeps UI and API routes in one project; better-sqlite3 is synchronous, zero-config, and the `data.db` file satisfies "remembers my input" with nothing to operate. Long-running extraction has no serverless timeout locally — the previous maxDuration concern disappears.

**Three tables: `offers`, `accounts`, `settings`.**
Same offer/account shape as before minus `user_id` (single user). Settings (base URL, model, API key, search model) move from localStorage into the `settings` key-value table: local machine, own key, no custody concern — and it survives browser data clears like everything else.

**Extraction pipeline: fetch → extract → search-if-needed.**

```
input (URL or text)
   │
   ├─ URL? server fetches page HTML → text     (home IP; often works,
   │                                             failure tolerated)
   ▼
OpenAI-compatible LLM extracts fields (zod-validated JSON)
   │
   ├─ churnable/interval still null?
   ▼
claude -p "search DoC/Reddit for <bank> <amount> churn rules"
        --model <settings.searchModel, default sonnet>
        --allowedTools WebSearch --output-format json
   │
   ▼
merged draft → pre-fill form → user confirms → save
```

Rationale: DeepSeek and other open-model APIs have no built-in web search; Claude Code's WebSearch is a server-side Anthropic tool that comes free with the Max subscription. Cheap work (field extraction from provided text) goes to the cheap API; the search-dependent work (churn rules, which bank pages never state) goes to the subprocess. If `claude` is missing or fails, churn fields stay null and the user fills them manually — search is an accelerator, not a gate.

**Claude Code invocation details.**
Spawn `claude -p <prompt> --output-format json --allowedTools WebSearch --model <searchModel>` with a generous timeout (3–5 min) and parse the JSON result field (itself zod-validated). No API key involved — it uses the CLI's existing subscription login. Sonnet default; Opus allowed but burns Max quota faster for no gain on a lookup task.

**Human confirmation before save** — unchanged. LLM output is a draft; churn data is community-sourced and labeled as such.

**Derived values are pure functions in `lib/dates.ts`, never stored** — unchanged; the core vitest surface.

**Implementation parallelized across subagents.**
Task groups are cut along module boundaries with no shared files: (a) DB layer + schema, (b) date math + tests, (c) extraction client + claude subprocess wrapper + tests, (d) UI pages. Groups a–c are independent and run as parallel subagents after the scaffold lands; UI integrates last against their interfaces (defined up front in the scaffold task as TypeScript types).

## Risks / Trade-offs

- [LLM extraction wrong / hallucinated churn rules] → confirmation form on every extraction; all fields editable later; churn labeled community-sourced.
- [Bank page blocks even home-IP fetch] → extraction falls back to searching by whatever the user pasted (or paste text directly); manual entry always works.
- [`claude` CLI absent/logged out/behavior changes across versions] → subprocess wrapper isolates it; any failure degrades to null churn fields, app fully usable without it.
- [Search subprocess is slow (1–3 min)] → UI shows staged progress (fetching → extracting → searching); search step only runs when churn fields are missing.
- [better-sqlite3 native module vs Node version] → pinned Node version in README; it's the only native dep.
- [data.db lost if project folder deleted] → README notes the file is the entire state; copying it is the backup.

## Migration Plan

Greenfield, local: scaffold → parallel subagent groups → integrate UI → vitest green → user acceptance. No deployment step. Rollback = git; data file untouched by code changes (schema created idempotently on boot).

## Open Questions

None — provider (DeepSeek default, OpenAI-compatible), search backend (Claude Code, Max, sonnet default), storage (SQLite), and no-auth are all confirmed.
