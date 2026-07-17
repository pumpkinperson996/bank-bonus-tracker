# responsive-dashboard

## Why

The dashboard is a 13-column table that overflows into a horizontal scrollbar even on wide screens, and is unusable on phones. The monthly fee — a value users check constantly — is buried as small print inside the 要求 and 账户 cells.

## What Changes

- Merge related columns so the desktop table fits 1400px with no horizontal scroll (~11 columns): 开户日期+已开户天数 → one, 关户日期+可再Churn → one, DD进度+DD截止 → one
- Promote 月费 to its own column (fee note moves out of the 要求/账户 cell small print)
- Below a mobile breakpoint (~900px), render offers as stacked cards (offer header + account sub-cards) instead of the table; same data and actions, no new logic

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `offer-tracking`: adds display requirements — no-horizontal-scroll desktop layout, dedicated monthly-fee column, mobile card layout (ADDED requirements; data model unchanged)

## Impact

- `app/page.tsx` (column regroup, card rendering path), `app/globals.css` (breakpoint, card styles)
- No API, DB, or lib changes; date computations in `lib/dates.ts` reused as-is
