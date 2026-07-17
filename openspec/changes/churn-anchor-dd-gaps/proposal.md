# churn-anchor-dd-gaps

## Why

Real usage shows two extraction gaps and one model gap: (1) dd_count and min_hold_days often come back empty even when the community documents them — they're missing from the gap-search field list and the extraction prompt doesn't derive them from common wordings; (2) churn_interval_months has no anchor: banks count the cooldown from bonus receipt (Chase) or from account closure (U.S. Bank), but the app silently assumes closure — the countdown can be months wrong.

## What Changes

- New offer field `churn_from` (`close` | `bonus` | null): extracted, gap-searched, editable in the form, shown wherever churn appears, and used as the cooldown anchor (bonus-received date vs closed date; null keeps today's closure behavior, labeled 基准未知)
- With `churn_from = bonus`, the cooldown countdown starts as soon as the bonus is received — even while the account is still open
- Gap search now also fills `dd_amount`, `dd_count`, and `churn_from`
- Extraction prompt derives dd_count from wordings ("two or more direct deposits" → 2) and min_hold_days from early-close wording ("$25 if closed within 6 months" → 180), still never guessing absent facts

## Capabilities

### Modified Capabilities

- `offer-extraction`: churn anchor extracted/searched; dd fields join the gap list
- `offer-tracking`: churn cooldown anchored per churn_from; anchor labeled in table/cards/form
- `deadline-computation`: cooldown eligibility computed from the anchored date

## Impact

- `lib/types.ts`, `lib/db.ts` (column + migration), `lib/llm.ts` (prompt), `lib/pipeline.ts` (gap lists), `lib/free-search.ts` (patch shape), `app/api/offers/route.ts`, `app/ui.tsx` (form), `app/new/page.tsx` (mergeTier), `app/page.tsx` (anchor + labels), tests
