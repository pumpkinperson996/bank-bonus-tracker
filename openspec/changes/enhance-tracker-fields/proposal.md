# Enhance Tracker Fields

## Why

First round of real usage surfaced gaps: DD progress is a bare counter (user wants per-DD dates and the transfer source — an original requirement that was dropped), multi-tier offers can't be extracted correctly, dates can't be edited after creation, and the churn-cooldown column reads as an empty fillable field instead of a computed one. Several high-value churning fields (minimum hold period, offer expiry, payout date, fee notes) are missing entirely.

## What Changes

- **DD events replace the counter**: each DD is a record (date, optional amount, optional source note e.g. "via Fidelity push"). Progress becomes a derived count. Existing `dd_done` counts migrate to events with null dates; column dropped.
- **Multi-tier extraction**: the LLM returns an array of tiers (e.g. Checking $300 / Savings $200 / Both $900); when more than one, the new-offer page shows a radio selector and fills the form from the chosen tier. Single tier behaves as today.
- **New offer fields**: `min_hold_days` (early-close fee window), `expires_on` (offer application deadline), `fee_note` (monthly fee + waiver), `notes`. All extractable by the LLM where stated on the page.
- **New account fields**: `notes`; `bonus_received` boolean replaced by `bonus_received_on` date (checkbox UI sets/clears it, default today).
- **New derived values**: safe-close date (opened + min_hold_days, with "closing early" warning), offer expiry countdown (expired offers greyed), payout wait (last DD → bonus received).
- **Editable dates**: `opened_on` editable after creation; add-account date input made prominent.
- **Churn column wording**: open accounts show "关户后起算" instead of "—" in 可再 Churn when the offer is churnable; **BREAKING** none (local tool, migration automatic).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `offer-extraction`: response becomes tier-based; new extractable fields; tier selection before form fill.
- `offer-tracking`: dd_events table; new offer/account fields; editable opened_on; automatic SQLite migration of existing data.
- `deadline-computation`: safe-close date, offer expiry countdown, payout wait.

## Impact

- Schema migration on existing `data.db` (idempotent, preserves data).
- `lib/types.ts`, `lib/db.ts`, `lib/dates.ts`, `lib/llm.ts`, extraction pipeline, all three pages.
- No new dependencies.
