# deadline-computation (delta)

## MODIFIED Requirements

### Requirement: Safe-close date
The system SHALL display the safe-close date (opened date + hold days) and days remaining using the account's minimum hold days when set, otherwise the offer's; the close action SHALL warn (confirmation) when the chosen close date is earlier than the safe-close date.

#### Scenario: Account hold days take precedence
- **WHEN** the offer says 180 hold days but the account records 90
- **THEN** the safe-close date is computed from 90 days

#### Scenario: Fallback to offer
- **WHEN** the account's hold days is null and the offer's is 180
- **THEN** the safe-close date is computed from 180 days

#### Scenario: Early close warning
- **WHEN** the user closes an account with a date before the safe-close date
- **THEN** a confirmation warns about the early-close fee/clawback before saving

#### Scenario: No hold period anywhere
- **WHEN** both account and offer hold days are null
- **THEN** no safe-close information is shown and closing never warns
