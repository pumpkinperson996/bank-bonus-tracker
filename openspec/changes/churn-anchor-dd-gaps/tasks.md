# churn-anchor-dd-gaps — tasks

## 1. Model & storage

- [x] 1.1 types: `churn_from` in ExtractionSchema/GapSearchSchema/Offer/OfferInput; GapSearch tiers gain dd_amount/dd_count; db: offers column + migration, create/update col lists; offers POST route passes churn_from

## 2. Extraction & search

- [x] 2.1 llm.ts prompt: churn_from semantics; dd_count/min_hold_days derivation rules
- [x] 2.2 pipeline: OFFER_GAP_FIELDS += churn_from, TIER_GAP_FIELDS += dd_amount/dd_count; free-search patch shape mentions the new keys

## 3. UI

- [x] 3.1 OfferForm churn_from select + blankOffer + mergeTier; dashboard table/card: anchor labels, cooldown anchored (bonus anchor counts on open accounts)

## 4. Tests & verify

- [x] 4.1 Tests: schema, db roundtrip/migration, pipeline missing-list includes new fields, anchored cooldown derive cases; tsc + npm test green; live extraction shows churn_from + dd_count captured
