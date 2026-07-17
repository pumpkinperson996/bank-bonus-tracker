# free-search-deepseek — tasks

## 1. Free search module

- [x] 1.1 `lib/free-search.ts`: DDG HTML search (query from bank/product/amount), pick top 2 doctorofcredit/reddit URLs, fetch via `fetchPageText`, gap-fill prompt to configured LLM, validate with `GapSearchSchema`, any failure → null
- [x] 1.2 Unit tests with mocked fetch: URL extraction from DDG HTML, source preference, null on throttle/invalid JSON

## 2. Pipeline chain

- [x] 2.1 `lib/pipeline.ts`: try free search first; if null or fills nothing, fall back to existing `searchGaps` (Claude); flags/source_note reflect which path answered
- [x] 2.2 Update `pipeline.test.ts` for chain order and fallback cases

## 3. Model default + migration

- [x] 3.1 `lib/db.ts`: default model `deepseek-v4-flash`; migrate stored `deepseek-chat`/`deepseek-reasoner` → `deepseek-v4-flash` on settings read
- [x] 3.2 Test: migration rewrites deprecated aliases only, leaves custom names alone

## 4. Verify

- [x] 4.1 `npm test` green; live end-to-end: paste a real bank offer URL, confirm free path fills churn fields in seconds without Claude
