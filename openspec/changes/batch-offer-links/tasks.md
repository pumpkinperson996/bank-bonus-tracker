# batch-offer-links — tasks

## 1. Batch detection & queue state

- [x] 1.1 `app/new/page.tsx`: parse input lines; ≥2 all-URL lines → batch mode with `{url, status, result?, error?}[]` state; otherwise existing flow untouched
- [x] 1.2 Sequential runner: one `/api/extract` in flight; start next while current result is under review

## 2. Queue UI & review flow

- [x] 2.1 Queue list with per-link status, review button on ready rows, retry/skip on failed rows, leave-page warning note
- [x] 2.2 Wire existing tiers/form phases as the review step for the active queue item; save advances to next ready item

## 3. Verify

- [x] 3.1 Live: paste 3 real offer URLs (one intentionally broken), confirm sequential analysis, overlap, retry/skip, and all saves land on dashboard; single-URL and text flows unchanged; `npm test` green
- [x] 5.1 Fix: saving a review while later links already finished clobbered fresh queue state via a stale closure (regressed items to 分析中 forever) and the unkeyed OfferForm kept stale busy state — functional setQueue + advance effect + keyed review cards; race e2e verified
