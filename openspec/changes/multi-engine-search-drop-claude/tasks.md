# multi-engine-search-drop-claude — tasks

## 1. Engine chain

- [x] 1.1 `lib/free-search.ts`: `SEARCH_ENGINES` table (ddg/bing/mojeek: url builder + regex extractor); per-engine loop that stops at first engine with ≥1 fetched source; engine name in source header
- [x] 1.2 Tests: per-engine extractors on sample HTML; chain falls through on 429 and on unfetchable URLs; null when all fail

## 2. Remove Claude search

- [x] 2.1 Delete `lib/claude-search.ts`; pipeline drops `search` dep and the remainder leg; extract route updated; delete parseClaudeOutput tests; update pipeline tests
- [x] 2.2 Drop `search_model` from types/db/settings API/Settings UI; update db tests

## 3. Docs

- [x] 3.1 README.md + README.zh-CN.md: remove Claude Code requirement/settings row/troubleshooting, update gap-search diagram and feature list

## 4. Verify

- [x] 4.1 tsc + `npm test` green; live: extraction with missing churn fills via engine chain; forced-DDG-failure path exercises Bing fallback
