# Tasks: Enhance Tracker Fields

Group 1 first (contract + migration). Groups 2 and 3 are independent — parallel subagents. Group 4 integrates UI, group 5 verifies.

## 1. Types, schema, migration

- [x] 1.1 `lib/types.ts`: add offer fields (min_hold_days, expires_on, fee_note, notes), account fields (notes, bonus_received_on replacing bonus_received), DdEvent type; restructure ExtractionSchema to offer-level fields + tiers array (tier_name, bonus_amount, requirements, dd_amount, dd_count, deadline_days, min_hold_days, fee_note)
- [x] 1.2 `lib/db.ts`: bootstrap migration (pragma table_info column checks → ALTER TABLE ADD COLUMN; create dd_events; dd_done counts → null-dated events then DROP COLUMN; bonus_received=1 → today into bonus_received_on then DROP COLUMN); dd_events CRUD (add/list/delete per account); extend offer/account CRUD to new fields
- [x] 1.3 API: `/api/accounts/[id]` PATCH accepts new fields incl. opened_on; POST/DELETE dd_events routes (`/api/accounts/[id]/dd`, `/api/dd/[id]`)
- [x] 1.4 Vitest: migration of a seeded old-schema db (rows survive, counts→events, second run idempotent); dd_events CRUD round-trip

## 2. Date math additions (parallel A)

- [x] 2.1 `lib/dates.ts`: `safeCloseOn(openedOn, minHoldDays, today)`, `expiryCountdown(expiresOn, today)`, `payoutWait(lastDdOn, receivedOn, today)` — null-tolerant, same conventions
- [x] 2.2 Vitest: spec scenarios (150d remaining, early-close detection input, expiring/expired, payout wait received/waiting, null cases)

## 3. Tiered extraction (parallel B)

- [x] 3.1 `lib/llm.ts`: prompt + schema for tier array output ("enumerate every distinct bonus tier"); validation unchanged in spirit
- [x] 3.2 `lib/pipeline.ts`: pass tiers through; churn search unchanged (bank-level); ExtractionResult carries offer-level fields + tiers
- [x] 3.3 Vitest: multi-tier response validation, single-tier, zero-tier, malformed tier rejected

## 4. UI integration (after 1–3)

- [x] 4.1 New-offer page: tier radio selector (>1 tier), merge chosen tier + offer-level into form; form gains min_hold_days, expires_on, fee_note, notes
- [x] 4.2 Dashboard: DD cell lists events (date · $ · source, "日期未记" for null) with add/delete inline; opened_on inline-editable; bonus-received checkbox sets/clears bonus_received_on (editable date); safe-close countdown + early-close confirm warning; offer expiry countdown + 已过期 greying; 可再 Churn shows 关户后起算 for open accounts on churnable offers; fee/notes as truncated tooltips
- [x] 4.3 Offer edit form gains the new fields

## 5. Verify

- [x] 5.1 Full vitest green + `next build` clean; live walkthrough against the existing data.db (migration observed, DD events, tier flow with a real multi-tier offer, early-close warning)
