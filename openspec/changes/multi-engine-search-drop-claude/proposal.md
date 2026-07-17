# multi-engine-search-drop-claude

## Why

The Claude Code fallback requires a paid subscription and a local CLI install — the opposite of the app's free, self-contained direction — and DuckDuckGo alone is a single point of failure (throttling/captcha kills gap search entirely). Multiple free engines cover the same need without any dependency.

## What Changes

- **BREAKING**: remove the Claude Code web-search fallback entirely — `lib/claude-search.ts`, the `search_model` setting, and its Settings UI section are deleted
- Free gap search gains an engine chain: DuckDuckGo → Bing → Mojeek (HTML endpoints, no keys). Each engine is tried until fetched source pages are actually in hand — an engine that returns URLs whose pages all fail to fetch counts as failed, and the next engine runs
- Gap-search chain becomes: multi-engine free search → blank for manual entry
- READMEs (EN/zh) updated: Claude Code requirement removed, diagram and troubleshooting revised

## Capabilities

### Modified Capabilities

- `offer-extraction`: gap-fill search chain loses the Claude step and gains engine fallback; settings lose the search-model field

## Impact

- Delete `lib/claude-search.ts`; `lib/free-search.ts` (engine chain), `lib/pipeline.ts` (drop Claude leg), `app/api/extract/route.ts`, `lib/types.ts`/`lib/db.ts`/`app/api/settings/route.ts`/`app/settings/page.tsx` (drop search_model), tests, README.md, README.zh-CN.md
- Users who relied on the Claude fallback lose its agentic coverage for obscure offers; the review form's manual entry remains the backstop
