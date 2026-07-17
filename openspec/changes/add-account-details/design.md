# Design: Add Account Details

## Context

Small additive change to the working tracker. Fee/hold terms move conceptually from offer-only to per-account, with the offer's values as creation-time defaults.

## Goals / Non-Goals

**Goals:** five account fields (name, type, monthly fee, penalty, hold days) as a grouped section; account edit form; account-first safe-close; additive migration.
**Non-Goals:** removing the offer-level fee_note/min_hold_days (they stay as extraction targets and defaults); per-account extraction.

## Decisions

- Columns on accounts: `name TEXT, account_type TEXT, monthly_fee TEXT, early_close_penalty TEXT, min_hold_days INTEGER` — fee and penalty free text ("$12，DD 免" fits no number). Same pragma-check ALTER migration pattern; purely additive.
- New `AccountForm` in app/ui.tsx (name, type, monthly fee, penalty, hold days, notes, opened date). "+开户" opens it (defaults: opened today, monthly_fee ← offer.fee_note, min_hold_days ← offer.min_hold_days); each account row gains an 编辑 toggle opening the same form.
- Dashboard: one new 账户 column after Churn (name bold + type; fee/penalty/notes as muted truncated tooltip lines). safeCloseOn called with `acct.min_hold_days ?? offer.min_hold_days`; same for the early-close warning. lib/dates.ts unchanged.

## Risks / Trade-offs

- [Table width grows again] → one column only, details folded as muted lines; horizontal scroll exists.

## Migration Plan

Automatic on next start; rollback = restore data.db copy.

## Open Questions

None.
