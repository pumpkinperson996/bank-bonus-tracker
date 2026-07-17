# deadline-computation (delta)

## MODIFIED Requirements

### Requirement: Churn cooldown countdown
For a closed account whose offer has a churn interval, the system SHALL display the date the user becomes churn-eligible again (closed date + interval months) and days remaining until then. For an OPEN account on a churnable offer, the cooldown column SHALL read "starts after close" (关户后起算) rather than appearing empty.

#### Scenario: Cooldown running
- **WHEN** an account closed 2 months ago against an offer with a 24-month churn interval
- **THEN** the offer shows churn-eligible in 22 months with the exact date

#### Scenario: Cooldown complete
- **WHEN** the eligibility date is in the past
- **THEN** the offer is shown as churn-eligible now

#### Scenario: Open account on churnable offer
- **WHEN** an account is still open and the offer has a churn interval
- **THEN** the cooldown column explains it starts from the close date instead of showing a blank

#### Scenario: Not churnable
- **WHEN** the offer is marked not churnable or its interval is null
- **THEN** no cooldown is displayed

## ADDED Requirements

### Requirement: Safe-close date
For an account whose offer has minimum hold days, the system SHALL display the safe-close date (opened date + hold days) and days remaining, and the close action SHALL warn (confirmation) when the chosen close date is earlier than the safe-close date.

#### Scenario: Safe-close countdown
- **WHEN** an account was opened 30 days ago against an offer with a 180-day hold period
- **THEN** the account shows the safe-close date and 150 days remaining

#### Scenario: Early close warning
- **WHEN** the user closes an account with a date before the safe-close date
- **THEN** a confirmation warns about the early-close fee/clawback before saving

#### Scenario: No hold period
- **WHEN** the offer's minimum hold days is null
- **THEN** no safe-close information is shown and closing never warns

### Requirement: Offer expiry countdown
For an offer with an expiry date, the system SHALL display days remaining to apply; expired offers are visually de-emphasized and labeled expired.

#### Scenario: Expiring offer
- **WHEN** an offer expires in 12 days
- **THEN** the offer shows 12 days left to apply

#### Scenario: Expired offer
- **WHEN** the expiry date is in the past
- **THEN** the offer is greyed out and labeled 已过期

### Requirement: Payout wait
For an account with DD events and a bonus-received date, the system SHALL display the days elapsed from the latest dated DD event to the received date; while not yet received, it SHALL display days since the latest dated DD event.

#### Scenario: Bonus received
- **WHEN** the last DD was 2026-06-17 and the bonus arrived 2026-07-01
- **THEN** the account shows a 14-day payout wait

#### Scenario: Waiting for payout
- **WHEN** DDs are complete but the bonus has not arrived
- **THEN** the account shows days elapsed since the last dated DD
