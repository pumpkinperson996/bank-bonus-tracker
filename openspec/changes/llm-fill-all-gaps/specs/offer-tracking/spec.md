# offer-tracking (delta)

## MODIFIED Requirements

### Requirement: Offer records
The system SHALL let the user create, view, edit, and delete offers with fields: bank name, product name, account type, bonus amount, requirements description, direct deposit amount/count, completion window (days), churnable flag, churn interval (months), minimum hold days, offer expiry date, fee note, early-close penalty, free-form notes, and source URL or text. All fields except bank name MAY be null.

#### Scenario: Create offer after confirmation
- **WHEN** the user confirms the extraction form
- **THEN** an offer row is created including product name, account type, and early-close penalty

#### Scenario: Edit offer later
- **WHEN** the user updates a field on a saved offer
- **THEN** the change is persisted and derived displays update accordingly

#### Scenario: Existing database upgraded
- **WHEN** the app starts against a data.db from before this change
- **THEN** the three columns are added, all rows survive, and a second startup changes nothing

### Requirement: Account records linked to offers
The system SHALL let the user record one or more accounts per offer, each with: opened date (required, editable after creation), closed date (optional), bonus-received date (optional; checkbox UI defaulting to today), free-form notes, and a grouped account-details section: account name, account type, monthly fee, early-close penalty, and minimum hold days (all optional). Account creation SHALL pre-fill name, type, monthly fee, early-close penalty, and hold days from the offer's stored values so the user confirms rather than types. DD progress is derived from DD event records. All account fields SHALL be editable via an account edit form.

#### Scenario: Account details pre-filled from offer
- **WHEN** the user clicks +开户 on an offer whose extraction provided product name, account type, fee, and penalty
- **THEN** the account form opens with those values already filled, editable before saving

#### Scenario: Edit account details later
- **WHEN** the user edits an account's monthly fee or early-close penalty
- **THEN** the values persist and display in the account's details

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
