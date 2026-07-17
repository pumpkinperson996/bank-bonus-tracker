# deadline-computation

## ADDED Requirements

### Requirement: Derived values computed at render time
Days-open, DD-deadline, and churn-cooldown values SHALL be computed by pure functions from stored dates at render time and MUST NOT be stored in the database.

#### Scenario: Values stay current across days
- **WHEN** the user views an account on consecutive days without editing it
- **THEN** days-open and countdowns reflect the current date each time

### Requirement: Days since account opened
The system SHALL display, for each open account, the number of days elapsed since its opened date.

#### Scenario: Days open
- **WHEN** an account was opened 10 days ago
- **THEN** the account shows 10 days open

### Requirement: DD deadline countdown
For an account whose offer has a completion window, the system SHALL display the deadline date (opened date + window days) and days remaining, and SHALL visually flag overdue or near-deadline (≤14 days) accounts whose bonus is not yet received.

#### Scenario: Days remaining
- **WHEN** an account was opened 30 days ago against an offer with a 90-day window
- **THEN** the account shows 60 days remaining until the DD deadline

#### Scenario: Deadline passed
- **WHEN** the window has elapsed and the bonus is not marked received
- **THEN** the account is flagged as overdue

#### Scenario: No window on offer
- **WHEN** the offer's completion window is null
- **THEN** no deadline or countdown is shown for its accounts

### Requirement: Churn cooldown countdown
For a closed account whose offer has a churn interval, the system SHALL display the date the user becomes churn-eligible again (closed date + interval months) and days remaining until then.

#### Scenario: Cooldown running
- **WHEN** an account closed 2 months ago against an offer with a 24-month churn interval
- **THEN** the offer shows churn-eligible in 22 months with the exact date

#### Scenario: Cooldown complete
- **WHEN** the eligibility date is in the past
- **THEN** the offer is shown as churn-eligible now

#### Scenario: Not churnable
- **WHEN** the offer is marked not churnable or its interval is null
- **THEN** no cooldown is displayed
