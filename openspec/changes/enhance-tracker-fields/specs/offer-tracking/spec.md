# offer-tracking (delta)

## MODIFIED Requirements

### Requirement: Offer records
The system SHALL let the user create, view, edit, and delete offers with fields: bank name, bonus amount, requirements description, direct deposit amount/count, completion window (days), churnable flag, churn interval (months), minimum hold days, offer expiry date, fee note, free-form notes, and source URL or text. All fields except bank name MAY be null.

#### Scenario: Create offer after confirmation
- **WHEN** the user confirms the extraction form
- **THEN** an offer row is created in the local database including any hold-period, expiry, fee, and notes values

#### Scenario: Edit offer later
- **WHEN** the user updates a field on a saved offer
- **THEN** the change is persisted and derived displays update accordingly

### Requirement: Account records linked to offers
The system SHALL let the user record one or more accounts per offer, each with: opened date (required, editable after creation), closed date (optional), bonus-received date (optional; checkbox UI defaulting to today), and free-form notes. DD progress is derived from DD event records, not stored as a counter.

#### Scenario: Open an account against an offer
- **WHEN** the user adds an account with an opened date to an offer
- **THEN** the account appears under that offer with computed countdowns

#### Scenario: Correct an opened date
- **WHEN** the user edits the opened date of an existing account
- **THEN** the new date persists and all derived values recompute from it

#### Scenario: Mark bonus received
- **WHEN** the user checks bonus-received
- **THEN** a received date (default today, editable) is stored; unchecking clears it

#### Scenario: Close an account
- **WHEN** the user sets a closed date
- **THEN** the account is shown as closed and the churn cooldown computation begins from that date

#### Scenario: Churn history preserved
- **WHEN** the user opens a second account against an offer previously closed
- **THEN** both account records remain visible under the offer

## ADDED Requirements

### Requirement: DD event records
The system SHALL let the user record individual direct-deposit events per account, each with: date (nullable), amount (nullable), and source note (nullable, e.g. "via Fidelity push"). Events can be added and deleted; DD progress displays as event count versus the offer's required count.

#### Scenario: Record a DD with source
- **WHEN** the user adds a DD event dated 2026-06-03 of $500 with note "Fidelity"
- **THEN** it appears under the account and progress increments by one

#### Scenario: Delete a mistaken event
- **WHEN** the user deletes a DD event
- **THEN** progress decrements accordingly

### Requirement: Automatic schema migration
On startup the system SHALL upgrade an existing database in place: add any missing columns, create the DD events table, convert stored DD counters to that many events with null dates, and convert a legacy bonus-received flag to today's date. Migration MUST be idempotent and preserve all existing rows.

#### Scenario: Old database upgraded
- **WHEN** the app starts against a pre-enhancement data.db containing offers and accounts with dd_done counts
- **THEN** all rows survive, each count becomes that many null-dated DD events, and a second startup changes nothing
