# responsive-dashboard — tasks

## 1. Shared derivation

- [x] 1.1 Lift per-account computed values (daysOpen, ddDeadline, safeCloseOn, churnEligibleOn, payoutWait, received) from `AccountCells` into one helper used by both layouts

## 2. Desktop table regroup

- [x] 2.1 `app/page.tsx`: merge 开户日期+已开户, 关户日期+可再Churn, DD进度+DD截止 into single cells; add 月费 column after 奖励; remove fee small print from 要求 cell; update colSpan counts
- [x] 2.2 `globals.css`: adjust widths so populated table fits 1400px without horizontal scroll

## 3. Mobile cards

- [x] 3.1 Card rendering path per offer with account sub-blocks (same data/actions, forms render inside card)
- [x] 3.2 `@media (max-width: 900px)`: hide table, show cards; card styles

## 4. Verify

- [x] 4.1 Run app with seeded multi-tier/multi-account data; check 1400px (no scrollbar), ~1200px (acceptable), 400px (cards, all actions work); `npm test` green
