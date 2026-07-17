# responsive-dashboard — design

## Context

`app/page.tsx` renders one `<table class="sheet">` with offer cells rowSpan-ing across account rows; `.sheet-wrap` provides `overflow-x: auto`. 13 columns: 银行/奖励/要求/Churn/账户/开户日期/已开户/DD进度/DD截止/关户日期/可再Churn/到账/操作. Monthly fee renders as `.muted` small print in two places.

## Goals / Non-Goals

**Goals:**
- No horizontal scrollbar at ≥1400px viewport; readable single-column cards on phones
- 月费 visible at a glance as its own column (desktop) / labeled line (mobile)

**Non-Goals:**
- No column show/hide preferences, no sorting/filtering, no virtualization
- No visual redesign beyond the regrouping (colors, badges, forms unchanged)

## Decisions

1. **Column merge over column hiding** — merged pairs are logically one fact (a date + its countdown). 13 → 11 columns: [开户/天数], [关户/冷却], [DD 进度+截止] each become one cell with the date on top and countdown/badge below — the table already stacks small print inside cells, so this is the established idiom.
2. **月费 column placement** after 奖励: `银行 | 奖励 | 月费 | 要求 | Churn | 账户 | 开户 | DD | 关户 | 到账 | 操作`. Shows offer-level `fee_note` (rowSpan like other offer cells); an account-level `monthly_fee` override renders in the 账户 cell as today.
3. **Mobile: separate card rendering, not CSS-transformed table** — the rowSpan structure cannot be linearized with CSS alone. Render `<div class="offer-card">` per offer with account sub-blocks under a `@media (max-width: 900px)` toggle (table hidden, cards shown). Both paths reuse the same computed values by lifting the per-account derivation (daysOpen/ddDeadline/safeCloseOn/churnEligibleOn/payoutWait) into a shared helper — computed once, rendered twice.
4. **Forms unchanged** — OfferForm/AccountForm/DdCell already stack vertically; on mobile they render inside the card instead of a colSpan row.

## Risks / Trade-offs

- [Two rendering paths to keep in sync] → shared derivation helper keeps logic single-source; only JSX differs
- [11 columns may still crowd small laptops (~1200px)] → merged cells shrink well (nowrap only on dates); accept minor squeeze, scrollbar remains as fallback for <1100px desktop windows
- [月费 column adds width while goal is less width] → paid for by the three merges; net −2 columns
