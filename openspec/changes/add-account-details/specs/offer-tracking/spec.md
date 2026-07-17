# offer-tracking (delta)

## MODIFIED Requirements

### Requirement: Account records linked to offers
The system SHALL let the user record one or more accounts per offer, each with: opened date (required, editable after creation), closed date (optional), bonus-received date (optional; checkbox UI defaulting to today), free-form notes, and a grouped account-details section: account name, account type, monthly fee, early-close penalty, and minimum hold days (all optional). DD progress is derived from DD event records, not stored as a counter. All account fields SHALL be editable via an account edit form.

#### Scenario: Open an account with details
- **WHEN** the user adds an account, entering name "Chase Total Checking", type "Checking"
- **THEN** the account appears under the offer with its details grouped, and monthly fee / hold days are pre-filled from the offer's fee note and hold days as editable defaults

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

#### Scenario: Existing database upgraded
- **WHEN** the app starts against a data.db from before this change
- **THEN** the five columns are added, all rows survive, and a second startup changes nothing
