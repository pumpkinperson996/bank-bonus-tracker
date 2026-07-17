# LLM Fills All Gaps

## Why

Account name, account type, monthly fee, and early-close penalty are currently typed by hand. The user wants the LLM to supply them: extract from the page per tier, and when anything important is still missing, web-search for it — the human only confirms.

## What Changes

- Tier extraction gains per-tier fields: `product_name` (账户产品名, e.g. "Chase Total Checking"), `account_type` (Checking/Savings/…), `early_close_penalty`. (Monthly fee already exists as `fee_note`; hold days as `min_hold_days`.)
- Offer stores three new columns (`product_name`, `account_type`, `early_close_penalty`) so the chosen tier's values persist; additive migration.
- The Claude Code search step generalizes from churn-only to **gap filling**: after extraction, one search call receives the full result and the list of still-null search-worthy fields (churnable, churn interval, expiry, and per-tier product name/type/fee/penalty/hold days/deadline) and returns values for whatever it finds; non-null answers fill only null slots. Unavailable CLI still degrades to nulls.
- "+开户" pre-fills name/type/monthly fee/penalty/hold days from the offer's stored values — the user confirms instead of typing.
- OfferForm and the new-offer merge include the three new fields; search-sourced values keep the community-sourced labeling.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `offer-extraction`: richer tier schema; churn search becomes general gap search.
- `offer-tracking`: three offer columns + account-creation pre-fill from them.

## Impact

`lib/types.ts`, `lib/llm.ts` (prompt), `lib/claude-search.ts` (gap search), `lib/pipeline.ts` (merge), `lib/db.ts` (+migration/tests), `app/ui.tsx`, `app/new/page.tsx`, `app/page.tsx`. Search now triggers on more extractions (longer waits, already-accepted trade-off).
