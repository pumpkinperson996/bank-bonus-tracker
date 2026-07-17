# offer-extraction

## ADDED Requirements

### Requirement: Extract offer fields from pasted input
The system SHALL accept a bank bonus URL or free-text description. For a URL, the server SHALL attempt to fetch the page content; fetch failure MUST NOT abort extraction. The content (fetched or pasted) SHALL be sent to the configured OpenAI-compatible LLM, which extracts: bank name, bonus amount, requirements description, direct deposit amount and count (if applicable), completion window in days, whether the offer is churnable, and churn interval in months. Undeterminable fields are returned as null.

#### Scenario: Successful extraction from URL
- **WHEN** the user pastes a bonus URL and submits
- **THEN** the system fetches the page, extracts structured fields via the configured LLM, and returns nulls for fields it could not determine

#### Scenario: Text description input
- **WHEN** the user pastes a plain-text offer description instead of a URL
- **THEN** extraction proceeds identically using the text as source material

#### Scenario: Page fetch blocked
- **WHEN** the pasted URL cannot be fetched (bot-blocked, network error)
- **THEN** extraction continues using the URL string and any user-pasted text, and the failure is noted in the result

### Requirement: Churn-rule web search via Claude Code
When churnability or churn interval is null after LLM extraction, the system SHALL invoke the locally installed Claude Code CLI headlessly (`claude -p` with the WebSearch tool, using the model configured in settings) to search community sources (e.g. Doctor of Credit, Reddit) for those fields. If the CLI is not installed, not authenticated, times out, or returns unparseable output, the fields SHALL remain null and extraction still succeeds.

#### Scenario: Churn info found by search
- **WHEN** extraction returns null churn fields and Claude Code finds community-reported churn rules
- **THEN** the churn fields are filled from search results and marked as community-sourced in the UI

#### Scenario: Claude Code unavailable
- **WHEN** the `claude` CLI is missing or fails
- **THEN** churn fields stay null, the form still opens with the other extracted fields, and a notice explains search was skipped

#### Scenario: Churn info already present
- **WHEN** the LLM extraction already determined churn fields from the page content
- **THEN** the search step is skipped entirely

### Requirement: Extraction result requires user confirmation
Extracted fields SHALL pre-fill an editable form and MUST NOT be saved until the user explicitly confirms.

#### Scenario: User edits before saving
- **WHEN** extraction returns a wrong bonus amount
- **THEN** the user can correct any field before confirming, and only confirmed values are persisted

#### Scenario: Extraction fails entirely
- **WHEN** the LLM call errors or finds nothing
- **THEN** the same form opens empty for fully manual entry and an error message is shown

### Requirement: LLM settings
The system SHALL provide a settings page for: OpenAI-compatible base URL, model name, API key, and search model (Claude Code model alias, default `sonnet`). Settings persist in the local SQLite database. The API key MUST NOT be logged.

#### Scenario: Configure DeepSeek
- **WHEN** the user saves base URL `https://api.deepseek.com`, model `deepseek-chat`, and their key
- **THEN** subsequent extractions call that endpoint with that key, and settings survive app restarts

#### Scenario: No key configured
- **WHEN** the user triggers extraction without a saved API key
- **THEN** the system prompts them to complete settings instead of calling the API

#### Scenario: Provider rejects key
- **WHEN** the LLM provider returns an authentication error
- **THEN** the error is surfaced to the user without retry loops

### Requirement: Extraction response validation
Both the LLM extraction output and the Claude Code search output SHALL be validated against a schema; output failing validation is treated as failure of that step (extraction error, or null churn fields respectively), never passed to the form as-is.

#### Scenario: Malformed LLM output
- **WHEN** the extraction LLM returns fields of the wrong type or structure
- **THEN** the route responds with an extraction error and no partial data is pre-filled

#### Scenario: Malformed search output
- **WHEN** Claude Code returns output that fails schema validation
- **THEN** churn fields remain null and the rest of the extraction result is unaffected
