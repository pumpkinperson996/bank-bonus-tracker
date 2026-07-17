# free-search-deepseek — design

## Context

`runExtraction` (lib/pipeline.ts) already isolates gap search behind `deps.search`. The Claude path (lib/claude-search.ts) shells out to the CLI with WebSearch. The extraction LLM call (lib/llm.ts) and page fetcher (lib/fetch-page.ts) are reusable as-is. Verified live: DDG HTML endpoint + 2 fetched sources + deepseek gap prompt reproduces Claude's answers on a real offer.

## Goals / Non-Goals

**Goals:**
- Zero-cost, zero-subscription gap fill as the primary path; Claude demoted to fallback
- Survive DDG rate-limits/captchas by degrading, never failing extraction
- Fix the `deepseek-chat` deprecation before 2026-07-24

**Non-Goals:**
- No search-provider setting/UI (DDG hardcoded; swap in code if it proves unreliable)
- No parallel search fan-out, no caching, no new dependencies

## Decisions

1. **DuckDuckGo HTML scrape over Brave/Bing APIs** — needs no API key, which is the whole point (free, open-source friendly). Unofficial endpoint may throttle; any failure returns `null` and the chain falls through to Claude. `// ponytail: DDG scrape; swap to Brave free tier if throttling bites`.
2. **Query shape**: `"<bank> <product> $<amount> bonus churn doctor of credit"`. Prefer result URLs matching `doctorofcredit.com|reddit.com`, take top 2, fetch via existing `fetchPageText` capped ~12k chars each. DoC pages carry churn, expiry, fee, and early-close info in one place — verified in the live test.
3. **Gap fill uses the configured extraction LLM** (same base_url/model/key, `response_format: json_object`, temp 0) with the same patch-object contract `GapSearchSchema` already validates. No new schema, no new settings.
4. **Chain in pipeline**: try free search; if it returns `null` or fills nothing, try Claude (existing behavior, unchanged); else blank. `search_used`/`search_skipped` flags keep their meaning; `source_note` says which path answered.
5. **Model migration**: default `deepseek-v4-flash`; on settings read, a stored value of exactly `deepseek-chat` (or `deepseek-reasoner`) is rewritten to `deepseek-v4-flash` once. Users on other providers are untouched.

## Risks / Trade-offs

- [DDG throttling] → returns null, Claude fallback or manual entry; UI notice already covers "search unavailable"
- [Wrong page picked → wrong churn data] → prompt forbids contradicting extracted values; values only fill nulls; `source_note` shows provenance for user review in the pre-filled form
- [deepseek-v4-flash verbose fee_note (observed)] → acceptable; user edits in review form
- [Silent migration surprises non-DeepSeek users] → migration keyed to the exact deprecated aliases only
