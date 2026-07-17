# offer-extraction (delta)

## ADDED Requirements

### Requirement: Churn anchor extracted and searched
Extraction SHALL return an offer-level `churn_from` value — `bonus` when the cooldown counts from the last bonus received, `close` when it counts from account closure, null when the source doesn't say. The gap search SHALL attempt to fill a null churn_from, and the review form SHALL let the user set it (关户日起 / 奖励到账日起 / 未知).

#### Scenario: Bonus-anchored rule extracted
- **WHEN** the page says "not eligible if you received a bonus on this account in the last 24 months"
- **THEN** churn_from is `bonus` and churn_interval_months is 24

#### Scenario: Close-anchored rule extracted
- **WHEN** the page says "must have been closed for at least 12 months"
- **THEN** churn_from is `close`

#### Scenario: Unstated stays null
- **WHEN** the source has no churn wording
- **THEN** churn_from is null and the search may fill it

### Requirement: DD fields join the gap search
`dd_amount` and `dd_count` SHALL be searchable gap fields: when extraction leaves them null, the free search includes them in the missing list and may fill them from community pages. Extraction SHALL derive dd_count from explicit count wordings (e.g. "two or more direct deposits" → 2) and min_hold_days from early-close periods (e.g. "$25 if closed within 6 months" → 180), never inventing values the source doesn't support.

#### Scenario: Count wording captured
- **WHEN** the page requires "two or more qualifying direct deposits totaling $3,000"
- **THEN** dd_count is 2 and dd_amount is 3000

#### Scenario: Hold days derived from penalty wording
- **WHEN** the page says accounts closed within 90 days forfeit the bonus
- **THEN** min_hold_days is 90

#### Scenario: Missing dd_count searched
- **WHEN** the offer page never states how many deposits are needed but the Doctor of Credit page does
- **THEN** the gap search fills dd_count from that page
