# Design: LLM Fills All Gaps

## Context

Third enhancement round. Principle: extract → search gaps → human confirms; typing is the fallback, not the default.

## Goals / Non-Goals

**Goals:** per-tier product_name/account_type/early_close_penalty extraction; generalized one-call gap search; offer stores the three fields; account creation pre-fills all five details.
**Non-Goals:** multiple search calls per extraction (one gap-search call only); overwriting extracted values with search results; searching for non-search-worthy fields (tier_name, requirements text).

## Decisions

- **Gap search replaces churn search** in lib/claude-search.ts: `searchGaps(extraction, missingFields, searchModel)` sends the extraction JSON + explicit missing-field list; prompt asks for a JSON patch `{ churnable?, churn_interval_months?, expires_on?, source_note?, tiers?: [{index, product_name?, account_type?, fee_note?, early_close_penalty?, min_hold_days?, deadline_days?}] }` from bank site + DoC/Reddit. Zod-validated; any failure → null (existing degrade path). `parseClaudeOutput` stays the testable pure helper.
- **Merge rule:** search values fill null slots only, per tier by index; source_note → churn_source_note as today; flags search_used/search_skipped unchanged in meaning.
- **Trigger:** any search-worthy field null (offer: churnable, churn_interval_months, expires_on; per tier: product_name, account_type, fee_note, early_close_penalty, min_hold_days, deadline_days). In practice most extractions will trigger one search (~1–3 min) — accepted.
- **Offer columns:** `product_name TEXT, account_type TEXT, early_close_penalty TEXT` (additive pragma-check migration). new/page merge maps tier fields into them; OfferForm gains the three inputs; dashboard shows product/type under bank name (muted) and penalty in the 要求 cell (muted).
- **Account pre-fill:** +开户 initial = { name ← offer.product_name, account_type ← offer.account_type, monthly_fee ← offer.fee_note, early_close_penalty ← offer.early_close_penalty, min_hold_days ← offer.min_hold_days }.

## Risks / Trade-offs

- [Nearly every extraction now waits on search] → single call, staged progress UI already exists; user explicitly chose completeness over speed.
- [Search hallucinates account terms] → fills only nulls, labeled community-sourced, human confirms every field before save.

## Migration Plan

Additive columns, automatic on start; rollback = restore data.db.

## Open Questions

None.
