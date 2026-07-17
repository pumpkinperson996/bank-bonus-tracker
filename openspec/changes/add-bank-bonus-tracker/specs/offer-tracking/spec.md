# offer-tracking

## ADDED Requirements

### Requirement: Offer records
The system SHALL let the user create, view, edit, and delete offers with fields: bank name, bonus amount, requirements description, direct deposit amount/count, completion window (days), churnable flag, churn interval (months), and source URL or text. All fields except bank name MAY be null.

#### Scenario: Create offer after confirmation
- **WHEN** the user confirms the extraction form
- **THEN** an offer row is created in the local database

#### Scenario: Edit offer later
- **WHEN** the user updates a field on a saved offer (e.g. fills in a churn interval learned later)
- **THEN** the change is persisted and derived displays update accordingly

### Requirement: Account records linked to offers
The system SHALL let the user record one or more accounts per offer, each with: opened date (required), closed date (optional), direct deposit progress count, and bonus-received flag.

#### Scenario: Open an account against an offer
- **WHEN** the user adds an account with an opened date to an offer
- **THEN** the account appears under that offer with computed countdowns

#### Scenario: Record DD progress
- **WHEN** the user increments DD progress on an account
- **THEN** the stored count updates and the UI shows progress against the offer's required DD count

#### Scenario: Close an account
- **WHEN** the user sets a closed date
- **THEN** the account is shown as closed and the churn cooldown computation begins from that date

#### Scenario: Churn history preserved
- **WHEN** the user opens a second account against an offer previously closed
- **THEN** both account records remain visible under the offer

### Requirement: Automatic local persistence
All offers, accounts, and settings SHALL persist in a SQLite database file in the project directory, created automatically on first run. Data MUST survive app restarts and browser storage clears without any import/export action.

#### Scenario: Restart retains data
- **WHEN** the user stops the app, restarts it, and reopens the browser
- **THEN** all previously saved offers, accounts, and settings are present

#### Scenario: First run
- **WHEN** the app starts with no existing database file
- **THEN** the database and schema are created automatically and the app opens empty
