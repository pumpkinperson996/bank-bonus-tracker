# offer-extraction (delta)

## MODIFIED Requirements

### Requirement: Extract offer fields from pasted input
The system SHALL accept a bank bonus URL or free-text description. For a URL, the server SHALL attempt to fetch the page content; fetch failure MUST NOT abort extraction. The content SHALL be sent to the configured OpenAI-compatible LLM, which returns offer-level fields (bank name, offer expiry date, churnability, churn interval months) and an array of bonus tiers, one per distinct bonus on the page, each with: tier name, bonus amount, requirements description, direct deposit amount and count, completion window in days, minimum hold days (early-close fee window), and fee note. Undeterminable fields are null; a page with one bonus yields one tier.

#### Scenario: Successful extraction from URL
- **WHEN** the user pastes a bonus URL and submits
- **THEN** the system fetches the page and returns offer-level fields plus at least one tier, with nulls for anything not determinable

#### Scenario: Multi-tier page
- **WHEN** the page offers multiple bonuses (e.g. checking $300, savings $200, both $900)
- **THEN** the extraction returns one tier per bonus with distinct amounts and requirements

#### Scenario: Text description input
- **WHEN** the user pastes a plain-text offer description instead of a URL
- **THEN** extraction proceeds identically using the text as source material

#### Scenario: Page fetch blocked
- **WHEN** the pasted URL cannot be fetched
- **THEN** extraction continues using the URL string and any user-pasted text, and the failure is noted in the result

## ADDED Requirements

### Requirement: Tier selection before form fill
When extraction returns more than one tier, the new-offer page SHALL present a selector (tier name + bonus amount) and fill the confirmation form from the chosen tier merged with offer-level fields. With exactly one tier the form fills directly; with zero tiers the form opens blank with a notice. Only the chosen tier's values are saved.

#### Scenario: User picks a tier
- **WHEN** extraction returns three tiers and the user selects "Checking+Savings $900"
- **THEN** the form pre-fills with that tier's amount and requirements plus the offer-level churn and expiry fields

#### Scenario: Single tier skips selection
- **WHEN** extraction returns exactly one tier
- **THEN** no selector is shown and the form pre-fills immediately
