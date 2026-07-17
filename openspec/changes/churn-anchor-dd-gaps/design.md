# churn-anchor-dd-gaps — design

## Context

`churnEligibleOn(anchorDate, months, today)` is already anchor-agnostic — callers hardwire `closed_on`. Offers have no anchor field. `TIER_GAP_FIELDS` omits dd_amount/dd_count, so search never fills them. Extraction prompt describes dd_count/min_hold_days but doesn't teach the common phrasings.

## Goals / Non-Goals

**Goals:**
- Cooldown counts from the right date per bank; the anchor is visible everywhere churn is shown
- dd_count / min_hold_days / dd_amount reachable by both extraction and gap search

**Non-Goals:**
- No per-account churn override; anchor is an offer-level fact
- No backfill of existing rows (churn_from stays null → labeled 基准未知, behaves as today)

## Decisions

1. **`churn_from` as TEXT column** with values `close`/`bonus`/NULL; presence-based migration like every other column. Zod: `z.enum(['close','bonus']).nullable()`.
2. **Anchor resolution in the dashboard derive step**: `anchor = churn_from === 'bonus' ? acct.bonus_received_on : acct.closed_on`. For `bonus`, the countdown starts at receipt even on an open account (that's the true rule — closing doesn't matter). Null churn_from keeps closure behavior and renders 基准未知 so users know to verify.
3. **Prompt teaching, not guessing**: dd_count from explicit count words ("two or more" → 2, "a direct deposit" → 1); min_hold_days derived from an early-close period ("within 6 months" → 180); churn_from from wording ("from last bonus" → bonus, "since account closed" → close). Absent facts stay null.
4. **Gap lists**: OFFER_GAP_FIELDS += churn_from; TIER_GAP_FIELDS += dd_amount, dd_count. GapSearchSchema and both prompts extended to match. churn_from isn't a grounding-checked string (enum, not free text).

## Risks / Trade-offs

- [LLM confuses the two anchors] → enum + review form select; source note shows the evidence
- [bonus-anchored cooldown on an account whose bonus_received_on is unset] → no anchor date yet → shows 奖励到账后起算 instead of a countdown
