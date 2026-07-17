# Design: Enhance Tracker Fields

## Context

The tracker (add-bank-bonus-tracker, implemented and in local use) needs field-level enhancements discovered during acceptance. All decisions were settled in exploration; this doc pins the shapes.

## Goals / Non-Goals

**Goals:** DD as dated events with source notes; multi-tier extraction with user selection; hold-period/expiry/payout/fee/notes fields; editable dates; clearer churn column; automatic migration of the existing `data.db`.

**Non-Goals:** application-date vs open-date distinction, hard-pull/ChexSystems tracking, geo restrictions (notes field covers rare needs); multi-offer-per-page extraction (one bank page at a time).

## Decisions

**dd_events table**: `id, account_id FK CASCADE, happened_on TEXT NULL, amount REAL NULL, source_note TEXT NULL`. Progress = COUNT(events). Migration: for each account with `dd_done = n > 0`, insert n events with null `happened_on` and source_note 'migrated from counter'; then drop `dd_done` (SQLite ≥3.35 supports DROP COLUMN). Null dates render as "日期未记".

**Migration mechanism**: extend the idempotent bootstrap in `lib/db.ts` — after CREATE TABLE IF NOT EXISTS, inspect `pragma table_info` and ALTER TABLE ADD COLUMN for each missing new column; create dd_events if missing; run the dd_done conversion only when the column still exists. No migration framework, no version table — column presence IS the version.

**New columns**: offers: `min_hold_days INTEGER NULL, expires_on TEXT NULL, fee_note TEXT NULL, notes TEXT NULL`. accounts: `notes TEXT NULL, bonus_received_on TEXT NULL` (replaces `bonus_received INTEGER`; migration: `1` → today's date as approximation, then drop). UI checkbox = date set/cleared (default today, date editable).

**Tiered extraction schema**:
```
{ bank_name, expires_on, churnable, churn_interval_months,   // bank/offer level
  tiers: [ { tier_name, bonus_amount, requirements, dd_amount,
             dd_count, deadline_days, min_hold_days, fee_note } ] }  // per tier
```
Prompt: enumerate every distinct bonus tier on the page. Pipeline: churn search unchanged (bank-level). New-offer page: >1 tier → radio list (tier_name + $amount), selection merges tier fields over bank-level fields into the form; 1 tier → straight to form; 0 tiers → blank form + notice. Saved offer keeps only the chosen tier (no tier storage).

**New derived functions** in `lib/dates.ts`: `safeCloseOn(openedOn, minHoldDays, today)` → {safeOn, daysRemaining, safeNow}; `expiryCountdown(expiresOn, today)` → {daysRemaining, expired}; `payoutWait(lastDdOn, receivedOn)` → days | null. Same pure/null-tolerant conventions.

**UI**: close flow warns (confirm dialog) when closing before safe-close date; expired offers greyed with "已过期"; 可再 Churn column shows "关户后起算" for open accounts on churnable offers; opened_on becomes an inline-editable date input; DD cell lists events (date · $amt · source) with add/delete.

Table width grows — group the three date-ish computed columns and rely on the existing horizontal scroll; fee_note/notes render as title-attribute tooltips with truncation.

## Risks / Trade-offs

- [Migration bug corrupts live data.db] → migration is additive except two column drops, which run last; vitest covers migrating a seeded old-schema db; README already documents copy-file backup.
- [LLM tier splitting is wrong/over-eager] → user picks the tier and edits the form; single-tier pages unaffected.
- [Table too wide] → horizontal scroll + tooltips; if it becomes unusable that's a future column-toggle change, not this one.

## Migration Plan

Bootstrap migration runs automatically on next server start after deploy of the code. Rollback: restore `data.db` copy.

## Open Questions

None.
