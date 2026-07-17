# Tasks: LLM Fills All Gaps

## 1. Contract + data

- [x] 1.1 `lib/types.ts`: TierSchema += product_name/account_type/early_close_penalty; GapSearchSchema (patch shape incl. per-tier index); Offer/OfferInput += the three fields
- [x] 1.2 `lib/db.ts`: additive migration + CRUD for the three offer columns; db tests updated

## 2. Extraction + search (parallel A)

- [x] 2.1 `lib/llm.ts`: prompt extracts the new per-tier fields
- [x] 2.2 `lib/claude-search.ts`: `searchGaps(extraction, missing, model)` with patch-shaped output, validated; degrade to null
- [x] 2.3 `lib/pipeline.ts`: search-worthy trigger over all gap fields; null-only merge per tier index; flags preserved
- [x] 2.4 Vitest: gap trigger/no-trigger, null-only merge (extracted wins), per-tier patch by index, malformed patch → nulls

## 3. UI (parallel B)

- [x] 3.1 `app/ui.tsx` OfferForm += 账户产品名/账户类型/提前关户惩罚; blankOffer updated
- [x] 3.2 `app/new/page.tsx`: merge maps tier product/type/penalty into the offer fields
- [x] 3.3 `app/page.tsx`: product/type muted under bank name, penalty muted in 要求 cell; +开户 pre-fills all five details from offer

## 4. Verify

- [x] 4.1 vitest green, tsc clean, live API walkthrough incl. migration on real data.db
