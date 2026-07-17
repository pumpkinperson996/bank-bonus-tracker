# Add Account Details

## Why

Fee, penalty, and hold-period terms currently live only on the Offer, but they really belong to each opened account: one offer can spawn a checking and a savings account with different types, monthly fees, early-close penalties, and safe-close windows. The user also wants a name per account and these details grouped as their own section.

## What Changes

- Account gains five nullable fields, displayed as a grouped "账户信息" section: `name` (账户名称), `account_type` (账户类型, free text e.g. Checking/Savings), `monthly_fee` (月费, free text incl. waiver), `early_close_penalty` (提前关户惩罚, free text), `min_hold_days` (安全关户天数, integer).
- Adding an account pre-fills `monthly_fee` from the offer's `fee_note` and `min_hold_days` from the offer's value; all editable.
- Safe-close computation and early-close warning use the account's `min_hold_days`, falling back to the offer's when null.
- Accounts become editable via a small form (the five fields + notes); "+开户" opens it with the opened date.
- Dashboard gains one 账户 column (name + type; fee/penalty as muted/tooltip lines).
- Additive SQLite migration (5 ALTER TABLE columns), idempotent as before.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `offer-tracking`: account record fields + edit form + creation pre-fill.
- `deadline-computation`: safe-close source becomes account-first.

## Impact

`lib/types.ts`, `lib/db.ts` (+migration +tests), `/api/accounts/[id]` and account-creation route, `app/ui.tsx` (AccountForm), `app/page.tsx`. No new dependencies; `lib/dates.ts` unchanged (caller passes the right value).
