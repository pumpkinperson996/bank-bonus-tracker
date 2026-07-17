# deadline-computation (delta)

## ADDED Requirements

### Requirement: Cooldown eligibility from an anchored date
Churn eligibility SHALL be computed by adding the churn interval (calendar months, day-of-month clamped) to the anchor date selected by the offer's churn_from — closed date for close/null, bonus-received date for bonus. A missing anchor date yields no eligibility date.

#### Scenario: Month arithmetic unchanged
- **WHEN** the anchor date is 2026-01-31 and the interval is 1 month
- **THEN** the eligible date is 2026-02-28

#### Scenario: No anchor date yet
- **WHEN** churn_from is bonus and the bonus has not been received
- **THEN** no eligible date is computed
