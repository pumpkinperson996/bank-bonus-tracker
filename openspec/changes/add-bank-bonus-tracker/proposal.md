# Add Bank Bonus Tracker (Local)

## Why

Tracking bank account opening bonuses by hand is error-prone: each offer has different requirements (direct deposit amounts/counts), deadlines, and churn rules scattered across bank pages and community sites. Missing a DD deadline forfeits the bonus; reopening too early violates churn windows. A local web app that extracts offer details via LLM and auto-computes deadlines removes both failure modes.

## What Changes

- New local-only web application (Next.js, run with `npm run dev`/`npm start`, opened at localhost). No auth, no cloud hosting, single user.
- All data persists in a SQLite file (`data.db`) in the project directory — offers, accounts, and settings survive restarts and browser cache clears with no import/export.
- Paste a bank bonus URL or text description → extraction pipeline:
  - The server fetches the pasted URL's content where possible.
  - An OpenAI-compatible LLM (user-configured base URL + model + key; default DeepSeek) extracts structured fields: bank name, bonus amount, requirements (DD amount/count), completion window, churnability, churn interval.
  - For churn info absent from the page, a web-search step runs Claude Code headless (`claude -p` with WebSearch, subscription auth, default model `sonnet`) to search community sources (Doctor of Credit, Reddit). If Claude Code is unavailable, those fields stay null for manual entry.
- Extracted fields pre-fill a form; nothing is saved until the user confirms.
- Data model: `Offer` 1→n `Account` (open date, close date, DD progress, bonus received).
- Derived values computed at render time (never stored): days open, DD deadline countdown, churn cooldown countdown.
- Settings page (stored in SQLite): OpenAI-compatible base URL/model/key, search backend model.
- Vitest suite (date math, extraction validation) must pass locally before user acceptance.
- Implementation note: task groups are structured for parallel execution by multiple subagents.

## Capabilities

### New Capabilities

- `offer-extraction`: URL fetch + OpenAI-compatible LLM extraction + Claude Code search fallback for churn rules; LLM settings management.
- `offer-tracking`: CRUD for offers and accounts, including DD progress and bonus-received status, persisted in SQLite.
- `deadline-computation`: Derived date calculations — days open, DD deadline countdown, churn cooldown countdown.

### Modified Capabilities

None (greenfield project).

## Impact

- New codebase: Next.js (App Router) + better-sqlite3; one extraction API route; `claude` CLI invoked as a subprocess for search.
- External dependencies at runtime: user's OpenAI-compatible LLM key (DeepSeek), locally installed Claude Code with an active Max subscription (optional — search degrades gracefully without it).
- No hosting cost, no cloud services, no auth surface.
