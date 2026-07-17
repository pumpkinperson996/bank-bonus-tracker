# fix-gap-search-and-settings

## Why

A real offer (MidFirst Bank) exposed two gap-search defects in one shot: the free search hallucinated a product name ("M Checking" — not on any fetched page), and because that counted as "filled something", the Claude fallback was skipped, leaving churn fields blank. Separately, the Settings page shows two unlabeled model inputs users can't tell apart.

## What Changes

- **Grounding check**: string values returned by the free gap search (product_name, account_type) are dropped unless they literally appear (case-insensitive) in the fetched source pages
- **Remainder fallback**: after the free search fills what it can, still-missing fields are recomputed and passed to the Claude CLI fallback (was: any fill skips Claude entirely)
- **Settings clarity**: label the extraction LLM ("解析 offer 页面和补缺") vs the search model ("Claude Code 兜底搜索"), each with a native `datalist` of common choices while keeping free-text input

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `offer-extraction`: gap-fill chain gains grounding validation and per-remaining-field fallback; settings requirements gain model labeling/suggestions

## Impact

- `lib/free-search.ts` (grounding filter), `lib/pipeline.ts` (recompute missing → fallback with remainder), `app/settings/page.tsx` (labels + datalists)
- Tests: free-search grounding cases, pipeline remainder-fallback cases
