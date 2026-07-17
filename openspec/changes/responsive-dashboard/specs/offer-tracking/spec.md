# offer-tracking (delta)

## ADDED Requirements

### Requirement: Desktop table fits without horizontal scroll
The dashboard table SHALL group each date with its derived countdown in a single column (opened date + days open; closed date + churn cooldown; DD progress + DD deadline) such that the full table fits a 1400px viewport without a horizontal scrollbar.

#### Scenario: Wide screen shows everything
- **WHEN** the dashboard renders at ≥1400px viewport width with populated offers and accounts
- **THEN** every column is visible with no horizontal scrollbar

#### Scenario: Merged cells keep both facts
- **WHEN** an account is open with a DD deadline
- **THEN** its cell shows the deadline date and the remaining-days countdown (with overdue/due-soon badges) together

### Requirement: Monthly fee column
The dashboard SHALL display the offer's monthly fee note as a dedicated column, not as small print inside other cells. An account-level monthly fee override SHALL remain visible with that account's details.

#### Scenario: Fee visible at a glance
- **WHEN** an offer has fee_note "$12, waivable with $1,500 DD"
- **THEN** it appears in the 月费 column of that offer's row

#### Scenario: No fee recorded
- **WHEN** fee_note is null
- **THEN** the 月费 cell shows an em dash

### Requirement: Mobile card layout
Below a 900px viewport width, the dashboard SHALL render each offer as a stacked card containing the offer summary (bank, bonus, fee, requirements, churn) and one sub-block per account with the same dates, countdowns, badges, and actions (edit, add account, DD events, close, bonus received) as the table.

#### Scenario: Phone rendering
- **WHEN** the dashboard renders at 400px viewport width
- **THEN** offers appear as vertically stacked cards with no horizontal scrolling, and all account actions remain usable

#### Scenario: Same numbers both layouts
- **WHEN** the same account is viewed at 1400px and at 400px
- **THEN** days open, deadlines, and cooldown values are identical
