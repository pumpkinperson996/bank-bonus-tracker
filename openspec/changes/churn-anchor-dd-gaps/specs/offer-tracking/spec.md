# offer-tracking (delta)

## ADDED Requirements

### Requirement: Churn cooldown anchored and labeled
The stored offer SHALL carry `churn_from` (close / bonus / null; existing rows null). Everywhere churn is displayed — table Churn column, mobile card, cooldown cell — the anchor SHALL be labeled (自关户 / 自奖励到账 / 基准未知). The cooldown countdown SHALL start from the account's closed date when the anchor is close (or null), and from the bonus-received date when the anchor is bonus — including while the account is still open.

#### Scenario: Bonus-anchored countdown on an open account
- **WHEN** an offer has churnable=true, churn_from=bonus, interval 24 months, and the account's bonus was received on 2026-01-10
- **THEN** the cooldown shows eligible on 2028-01-10 with a live countdown even though the account is open

#### Scenario: Bonus-anchored but bonus not yet received
- **WHEN** churn_from is bonus and bonus_received_on is null
- **THEN** the cell shows the cooldown starts after the bonus posts, with no date yet

#### Scenario: Unknown anchor labeled
- **WHEN** churn_from is null on an offer with a churn interval
- **THEN** the countdown uses the closed date as today and the label reads 基准未知
