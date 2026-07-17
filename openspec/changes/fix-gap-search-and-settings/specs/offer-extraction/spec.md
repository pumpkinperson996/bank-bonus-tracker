# offer-extraction (delta)

## ADDED Requirements

### Requirement: Free-search values are grounded in fetched sources
String identity fields returned by the free gap search (product name, account type) MUST appear literally (case-insensitive, ignoring ®/™ and whitespace differences) in the text of the fetched source pages; values that do not appear SHALL be discarded before the patch is applied.

#### Scenario: Hallucinated product name dropped
- **WHEN** the LLM returns product_name "M Checking" but no fetched page contains that string
- **THEN** product_name stays null (and remains eligible for the Claude fallback)

#### Scenario: Real product name kept
- **WHEN** the LLM returns "U.S. Bank Smartly® Checking" and a fetched page contains "U.S. Bank Smartly Checking"
- **THEN** the value is kept despite the ® difference

### Requirement: Claude fallback covers remaining gaps after a partial free fill
After the free search patch is applied, the system SHALL recompute which search-worthy fields are still null and, if any remain, SHALL invoke the Claude CLI fallback for ONLY those remaining fields. Fields filled by either step count as search-filled; the source note SHALL reflect every step that contributed.

#### Scenario: Free fills fee, Claude fills churn
- **WHEN** the free search fills fee_note but churnable is still null and Claude Code is installed
- **THEN** Claude is invoked with the remaining missing list and its churnable answer is applied

#### Scenario: Free fills everything
- **WHEN** the free search fills every missing field
- **THEN** Claude is not invoked

### Requirement: Settings explain and suggest both models
The Settings page SHALL label the extraction model as the LLM that parses offer pages and fills gaps, and the search model as the Claude Code model used only for fallback web search, each with a native suggestion list of common values while still accepting free text.

#### Scenario: User picks from suggestions
- **WHEN** the user focuses the model field
- **THEN** common choices (e.g. deepseek-v4-flash, deepseek-v4-pro, kimi-k2, qwen-max) are offered, and typing a custom name still works

#### Scenario: Roles are distinguishable
- **WHEN** a new user opens Settings
- **THEN** each model field states in its hint which pipeline step it powers
