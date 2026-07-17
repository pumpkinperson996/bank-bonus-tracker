# fix-gap-search-and-settings — design

## Context

`freeSearchGaps` (lib/free-search.ts) fetches DDG-picked pages and asks the configured LLM for a patch; nothing verifies the patch against the pages. `runExtraction` (lib/pipeline.ts) treats any successful fill as terminal — Claude (`deps.search`) only runs when the free step fills *nothing*. Settings page renders bare inputs for `model` and `search_model`.

## Goals / Non-Goals

**Goals:**
- Hallucinated string values cannot reach the form
- Every still-null search-worthy field gets a Claude attempt (when installed), regardless of what the free step filled
- Settings self-explanatory; common models one click away, custom values still typeable

**Non-Goals:**
- No grounding for booleans/numbers/dates (churnable=true or "12" appear on pages in too many textual forms to substring-match; the review form remains the safety net)
- No provider-fetched model lists, no new settings fields

## Decisions

1. **Grounding = case-insensitive substring over concatenated source texts**, applied inside `freeSearchGaps` to `product_name` and `account_type` only (the fields where hallucination showed up and where literal-match is reliable). `fee_note`/`early_close_penalty`/`source_note` are prose the LLM legitimately rephrases — not groundable by substring; left as-is.
2. **Remainder fallback in the pipeline**: after applying the free patch, recompute the missing list with the same loop used initially; if non-empty, call `deps.search` with only the remaining paths and apply its patch. `search_used` = anything filled by either step; `source_note` = concatenation when both contributed (free note first).
3. **Datalist over select** — native, zero deps, keeps free-text input. LLM suggestions: `deepseek-v4-flash`, `deepseek-v4-pro`, `kimi-k2`, `qwen-max`. Search-model suggestions: `sonnet`, `opus`, `haiku`. Hints state each model's role in one line (中文与现有 UI 一致).

## Risks / Trade-offs

- [Grounding drops legitimately reworded product names (e.g. "®" stripped)] → normalize both sides (lowercase, strip ®/™, collapse whitespace) before matching
- [Always-run remainder fallback adds ~40s when Claude is installed and churn genuinely isn't documented anywhere] → same cost as pre-free-search behavior; only triggered when fields are actually still missing
- [Two source_note origins concatenated could get long] → UI already truncates with tooltip (churn-cell .trunc)
