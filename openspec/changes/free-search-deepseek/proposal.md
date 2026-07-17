# free-search-deepseek

## Why

Gap-filling churn/fee fields currently requires a Claude Pro/Max subscription and takes ~40s per offer (~$0.61 API-equivalent). A live A/B test (U.S. Bank $450 offer, 2026-07-09) showed a free DuckDuckGo search + the already-configured DeepSeek model answers the same 6 gap fields identically in ~3s for ~$0.0007. Separately, the app's default model name `deepseek-chat` is deprecated by DeepSeek on 2026-07-24 — extraction breaks for anyone on the default after that date.

## What Changes

- New free gap-search step: DuckDuckGo HTML search → fetch top community sources (Doctor of Credit, Reddit) → configured LLM fills the missing fields. Runs first.
- Claude Code CLI search becomes the fallback (runs only when the free step returns nothing), then manual entry — chain: free → claude → blank.
- Default LLM model changes from `deepseek-chat` to `deepseek-v4-flash`; stored settings still holding the deprecated alias are migrated on startup.
- No new dependencies; search uses plain `fetch` like the existing page fetcher.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `offer-extraction`: the single Claude-CLI gap-search requirement becomes a two-step chain (free search first, Claude fallback); default/stored model name updated for the provider deprecation.

## Impact

- `lib/free-search.ts` (new), `lib/pipeline.ts` (chain), `lib/db.ts` (default + migration), `lib/claude-search.ts` (unchanged, now fallback)
- Settings UI default text; New-offer notices ("community-sourced" label already exists)
- Removes the hard dependency on a Claude subscription for full functionality — prerequisite for open-sourcing
