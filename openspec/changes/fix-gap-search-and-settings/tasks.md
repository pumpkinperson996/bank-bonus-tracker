# fix-gap-search-and-settings — tasks

## 1. Grounding check

- [x] 1.1 `lib/free-search.ts`: normalize (lowercase, strip ®/™, collapse spaces) and drop ungrounded product_name/account_type from the patch; tests for dropped hallucination, kept ®-variant, untouched prose fields

## 2. Remainder fallback

- [x] 2.1 `lib/pipeline.ts`: extract missing-field computation into a helper; after free fill, recompute and call Claude with only the remainder; merge source notes; update flags
- [x] 2.2 Pipeline tests: partial free fill → Claude called with remainder; full free fill → Claude skipped; both notes merged

## 3. Settings

- [x] 3.1 `app/settings/page.tsx`: labeled hints for both models + `datalist` suggestions (LLM: deepseek-v4-flash/deepseek-v4-pro/kimi-k2/qwen-max; search: sonnet/opus/haiku)

## 4. Verify

- [x] 4.1 `npm test` + tsc green; live: re-analyze the MidFirst offer URL and confirm no fabricated product name survives and churn fields get a Claude attempt
