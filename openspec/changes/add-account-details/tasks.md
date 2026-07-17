# Tasks: Add Account Details

## 1. Data

- [x] 1.1 `lib/types.ts`: Account gains name, account_type, monthly_fee, early_close_penalty (string|null), min_hold_days (number|null)
- [x] 1.2 `lib/db.ts`: additive migration (5 columns) + include fields in account CRUD; `/api/accounts/[id]` PATCH and account-creation POST whitelist them
- [x] 1.3 Vitest: migration adds columns idempotently; fields round-trip

## 2. UI

- [x] 2.1 `app/ui.tsx`: AccountForm (grouped 账户信息 section + opened date + notes)
- [x] 2.2 `app/page.tsx`: "+开户" opens AccountForm with offer-derived defaults; per-account 编辑 opens it pre-filled; new 账户 column (name/type + muted fee/penalty/notes); safe-close and early-close warning use acct.min_hold_days ?? offer.min_hold_days

## 3. Verify

- [x] 3.1 vitest green, tsc clean, live check: add account with details, edit it, safe-close fallback both ways, migration observed on real data.db
