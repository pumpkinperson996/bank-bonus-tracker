# offer-extraction (delta)

## ADDED Requirements

### Requirement: Batch link analysis
When the New-offer input contains two or more lines that are each a URL, the system SHALL queue them and analyze them sequentially, showing per-link status (queued, analyzing, ready, failed). Each analyzed link SHALL go through the existing review form (including tier selection) before saving; saving one SHALL surface the next ready result. A failed link SHALL be retryable or skippable without affecting the rest of the queue. A single URL or non-URL text SHALL keep the existing single-offer flow.

#### Scenario: Paste five links
- **WHEN** the user pastes five offer URLs (one per line) and clicks Analyze
- **THEN** a queue of five appears, links are analyzed one at a time, and each completed analysis opens the normal review form in turn

#### Scenario: Review overlaps analysis
- **WHEN** the user is reviewing the first result
- **THEN** the next queued link is already being analyzed in the background

#### Scenario: One link fails
- **WHEN** the third link's page cannot be fetched or extraction errors
- **THEN** that row shows the failure with retry and skip options, and remaining links continue analyzing

#### Scenario: Single input unchanged
- **WHEN** the user pastes one URL or a plain-text description
- **THEN** the flow behaves exactly as before, with no queue UI
