# batch-offer-links

## Why

Adding offers is one-at-a-time: paste a link, wait for analysis, review, save, repeat. Users collect batches of links (e.g. from a Doctor of Credit roundup) and want to paste them all at once and let the app work through them.

## What Changes

- The New-offer input accepts multiple URLs (one per line); a single URL or plain text keeps the current flow unchanged
- Multiple URLs enter a visible queue analyzed sequentially (statuses: queued / analyzing / ready / failed)
- Each analyzed link is reviewed through the existing form (including tier selection); saving advances to the next
- Failed links can be retried or skipped without losing the rest of the queue

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `offer-extraction`: adds a batch-input requirement to the new-offer flow (extraction pipeline itself unchanged)

## Impact

- `app/new/page.tsx` only (input parsing, queue state, per-link status UI); `/api/extract` reused per link, no backend changes
- Depends on `free-search-deepseek` for practicality: at ~40s/link (Claude search) batches are painful; at ~5s/link they work
