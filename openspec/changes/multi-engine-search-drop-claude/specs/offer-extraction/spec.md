# offer-extraction (delta)

## MODIFIED Requirements

### Requirement: Gap-fill search chain
When search-worthy fields are null after LLM extraction — offer-level churnability, churn interval, or expiry, or per-tier product name, account type, monthly fee, early-close penalty, hold days, or completion window — the system SHALL run a free web search through a chain of keyless engines (DuckDuckGo, then Bing, then Mojeek): each engine is tried in order until at least one preferred source page (Doctor of Credit / Reddit favored) has been fetched, then the configured LLM fills ONLY the missing fields from those pages. Returned non-null values SHALL fill only null slots, string identity fields MUST be grounded in the fetched pages, and extracted values are never overwritten. If every engine fails or the pages contain nothing, the fields remain null, extraction still succeeds, and a notice tells the user to fill them manually.

#### Scenario: First engine throttled, second succeeds
- **WHEN** DuckDuckGo returns HTTP 429 and Bing returns results whose top page fetches
- **THEN** the gap fill proceeds from the Bing-found pages without user-visible failure

#### Scenario: Engine URLs unfetchable count as failure
- **WHEN** an engine returns URLs but every page fetch fails
- **THEN** the next engine in the chain is tried

#### Scenario: All engines fail
- **WHEN** no engine yields a fetchable page
- **THEN** missing fields stay null, the form opens with a search-skipped notice, and manual entry proceeds

#### Scenario: Extracted values win
- **WHEN** the page already stated the monthly fee
- **THEN** no search result overwrites it

## REMOVED Requirements

### Requirement: Claude fallback covers remaining gaps after a partial free fill
**Reason**: The Claude Code CLI dependency (paid subscription, local install) is removed by user decision; the free multi-engine chain is the only search step.
**Migration**: None required — the `search_model` setting is deleted and stale rows are ignored; users fill unresolved fields manually in the review form.
