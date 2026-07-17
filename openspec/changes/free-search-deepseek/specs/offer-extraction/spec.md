# offer-extraction (delta)

## RENAMED Requirements

- FROM: `### Requirement: Churn-rule web search via Claude Code`
- TO: `### Requirement: Gap-fill search chain`

## MODIFIED Requirements

### Requirement: Gap-fill search chain
When search-worthy fields are null after LLM extraction — offer-level churnability, churn interval, or expiry, or per-tier product name, account type, monthly fee, early-close penalty, hold days, or completion window — the system SHALL first run a free web search (DuckDuckGo HTML results, preferring Doctor of Credit and Reddit pages), fetch the top matching pages, and ask the configured LLM to fill ONLY the missing fields from those pages. If the free step fails or fills nothing, the system SHALL fall back to the locally installed Claude Code CLI (WebSearch tool, model from settings) as before. Returned non-null values SHALL fill only the corresponding null slots; extracted values are never overwritten. If every step is unavailable or finds nothing, the fields remain null and extraction still succeeds.

#### Scenario: Free search fills the gaps
- **WHEN** extraction from a bank's own page leaves churn fields null and a Doctor of Credit page found via free search states them
- **THEN** the fields are filled from that page, labeled community-sourced with the source in the note, without invoking Claude

#### Scenario: Free search finds nothing, Claude fallback runs
- **WHEN** the free search is throttled or its pages do not contain the missing values
- **THEN** the Claude CLI search runs with the same missing-field list and its results fill the remaining nulls

#### Scenario: Extracted values win
- **WHEN** the page already stated the monthly fee
- **THEN** no search result overwrites it

#### Scenario: Everything unavailable
- **WHEN** free search fails and the `claude` CLI is missing or fails
- **THEN** unfilled fields stay null, the form still opens, and a notice explains search was skipped

#### Scenario: Nothing missing
- **WHEN** extraction already determined every search-worthy field
- **THEN** both search steps are skipped entirely

## ADDED Requirements

### Requirement: Current default model and deprecated-alias migration
The default LLM model SHALL be `deepseek-v4-flash`. On settings read, a stored model value of exactly `deepseek-chat` or `deepseek-reasoner` (deprecated by the provider on 2026-07-24) SHALL be rewritten to `deepseek-v4-flash`; any other stored value MUST be left untouched.

#### Scenario: Fresh install
- **WHEN** the app runs with no saved model setting
- **THEN** extraction uses `deepseek-v4-flash`

#### Scenario: Existing user on the deprecated alias
- **WHEN** settings contain `deepseek-chat`
- **THEN** the value is migrated to `deepseek-v4-flash` and extraction keeps working after the provider removes the alias

#### Scenario: Custom provider untouched
- **WHEN** settings contain `qwen-max` or any non-deprecated name
- **THEN** the stored value is not modified
