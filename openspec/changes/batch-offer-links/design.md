# batch-offer-links — design

## Context

`app/new/page.tsx` is a phase machine: input → analyzing → (tiers) → form. `/api/extract` takes one input and returns one `ExtractionResult`. Multi-tier results require a human pick, so batch processing cannot be fully automatic — every link ends in a human review step regardless.

## Goals / Non-Goals

**Goals:**
- Paste N links, walk away, come back to N ready-to-review results
- Zero backend changes; one link analyzed at a time (no parallel LLM calls)

**Non-Goals:**
- No auto-save without review (tier choice + value corrections are the product's safety net)
- No background jobs/persistence — the queue lives in page state; leaving the page abandons it
- No mixed batch of text descriptions (multi-line text is indistinguishable from one description; batch triggers only when every non-empty line parses as a URL and there are ≥2)

## Decisions

1. **Batch detection**: split input on newlines, trim; if ≥2 lines and all start with http(s)://, it's a batch. Otherwise the existing single flow runs untouched — no new UI mode for the common case.
2. **Sequential analysis, eager start**: analyze link i+1 while the user reviews link i's form (analysis is network-bound, review is human-bound; overlapping them is free). One in-flight request at a time.
3. **Queue UI**: list above the form area — each row shows the URL, status (⬜ queued / ⏳ analyzing / ✅ ready / ⚠ failed), and for ready rows a "review" button. Saving a reviewed offer marks the row done and opens the next ready one automatically.
4. **Failures stay in the queue** with the error message and retry/skip buttons — reusing the existing error → manual-entry fallback per link.
5. **State shape**: `{url, status, result?, error?}[]` in a `useState` array; the existing phase machine becomes the "review one item" child of the queue when in batch mode.

## Risks / Trade-offs

- [Queue lost on navigation] → acceptable for a local single-user tool; noted in UI ("不要离开本页")
- [Provider rate limits on many sequential calls] → one-at-a-time already throttles; failures land in the retry state
- [Reviewing N forms is still N human steps] → inherent: tier choice can't be automated safely; eager analysis removes all machine wait between reviews
