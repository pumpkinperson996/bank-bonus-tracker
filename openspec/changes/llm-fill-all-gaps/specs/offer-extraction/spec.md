# offer-extraction (delta)

## MODIFIED Requirements

### Requirement: Churn-rule web search via Claude Code
When search-worthy fields are null after LLM extraction — offer-level churnability, churn interval, or expiry, or per-tier product name, account type, monthly fee, early-close penalty, hold days, or completion window — the system SHALL invoke the locally installed Claude Code CLI headlessly (WebSearch tool, model from settings) once with the extraction result and the missing-field list, searching the bank's site and community sources. Returned non-null values SHALL fill only the corresponding null slots; extracted values are never overwritten. If the CLI is unavailable, times out, or returns invalid output, the fields remain null and extraction still succeeds.

#### Scenario: Gap search fills account details
- **WHEN** extraction finds the bonus but not the account type, monthly fee, or early-close penalty
- **THEN** the search step queries for them and the found values pre-fill the form, labeled community-sourced

#### Scenario: Extracted values win
- **WHEN** the page already stated the monthly fee
- **THEN** the search result never overwrites it

#### Scenario: Claude Code unavailable
- **WHEN** the `claude` CLI is missing or fails
- **THEN** unfilled fields stay null, the form still opens, and a notice explains search was skipped

#### Scenario: Nothing missing
- **WHEN** extraction already determined every search-worthy field
- **THEN** the search step is skipped entirely

### Requirement: Extract offer fields from pasted input
The system SHALL accept a bank bonus URL or free-text description. For a URL, the server SHALL attempt to fetch the page content; fetch failure MUST NOT abort extraction. The content SHALL be sent to the configured OpenAI-compatible LLM, which returns offer-level fields (bank name, offer expiry date, churnability, churn interval months) and an array of bonus tiers, one per distinct bonus on the page, each with: tier name, product name, account type, bonus amount, requirements description, direct deposit amount and count, completion window in days, minimum hold days, monthly fee note, and early-close penalty. Undeterminable fields are null; a page with one bonus yields one tier.

#### Scenario: Account details extracted per tier
- **WHEN** the page offers a "Total Checking" bonus and a "Savings" bonus
- **THEN** each tier carries its own product name, account type, fee note, and early-close penalty where stated

#### Scenario: Successful extraction from URL
- **WHEN** the user pastes a bonus URL and submits
- **THEN** the system fetches the page and returns offer-level fields plus at least one tier, with nulls for anything not determinable

#### Scenario: Text description input
- **WHEN** the user pastes a plain-text offer description instead of a URL
- **THEN** extraction proceeds identically using the text as source material

#### Scenario: Page fetch blocked
- **WHEN** the pasted URL cannot be fetched
- **THEN** extraction continues using the URL string and any user-pasted text, and the failure is noted in the result
