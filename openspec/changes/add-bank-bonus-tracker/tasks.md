# Tasks: Bank Bonus Tracker (Local)

Groups 2, 3, 4 are independent after group 1 lands — run them as parallel subagents. Group 5 integrates against the types defined in 1.2.

## 1. Scaffold (sequential, first)

- [x] 1.1 Scaffold Next.js (App Router, TypeScript) with better-sqlite3, zod, vitest; `.gitignore` includes `data.db`
- [x] 1.2 Define shared TypeScript types + zod schemas in `lib/types.ts`: Offer, Account, Settings, ExtractionResult — the contract the parallel groups build against

## 2. Data layer (subagent A)

- [x] 2.1 `lib/db.ts`: open/create `data.db`, idempotent schema creation (offers, accounts, settings key-value)
- [x] 2.2 CRUD functions: offers (create/list/update/delete), accounts (create/update/delete per offer), settings (get/set)
- [x] 2.3 API routes wrapping CRUD: `/api/offers`, `/api/offers/[id]`, `/api/accounts/[id]`, `/api/settings`
- [x] 2.4 Vitest: schema creation on fresh file, CRUD round-trip, restart-retains-data (reopen same file)

## 3. Date math (subagent B)

- [x] 3.1 `lib/dates.ts` pure functions: `daysOpen`, `ddDeadline` (deadline date, days remaining, overdue/near ≤14d flags), `churnEligibleOn` (closed + interval months, eligible-now); null-tolerant
- [x] 3.2 Vitest covering spec scenarios: days open, remaining, overdue, no-window, cooldown running/complete/not-churnable

## 4. Extraction pipeline (subagent C)

- [x] 4.1 `lib/llm.ts`: OpenAI-compatible chat client (base URL/model/key from settings), JSON-mode extraction prompt, zod-validate response; key never logged
- [x] 4.2 `lib/fetch-page.ts`: server-side fetch of pasted URL → readable text; failure returns null, never throws
- [x] 4.3 `lib/claude-search.ts`: spawn `claude -p --output-format json --allowedTools WebSearch --model <searchModel>` with 5-min timeout; parse + zod-validate; missing CLI/auth/timeout/bad output → null churn fields
- [x] 4.4 `/api/extract` route: fetch → extract → search-if-churn-null → merged ExtractionResult; distinct errors for missing key vs provider auth failure vs validation failure
- [x] 4.5 Vitest: extraction schema validation (malformed → rejected), claude output parsing (good/bad/missing), pipeline merge logic with mocked steps

## 5. UI (after 2–4)

- [x] 5.1 Settings page: base URL, model, API key, search model (default `sonnet`); loads/saves via `/api/settings`
- [x] 5.2 New-offer flow: paste URL/text → staged progress (fetching → extracting → searching) → editable pre-filled form (blank on failure, notice when search skipped, churn fields labeled community-sourced) → confirm saves
- [x] 5.3 Dashboard: offers with accounts under each — days open, DD progress vs required, DD deadline countdown with overdue/near flags, churn cooldown status
- [x] 5.4 Account actions: add (opened date), increment DD progress, set closed date, mark bonus received; offer edit/delete
- [x] 5.5 Dashboard redesigned as a spreadsheet-style table (user feedback during acceptance): one row per account, offer cells row-spanned, computed columns always visible

## 6. Verify

- [ ] 6.1 All vitest tests pass; `npm run dev` manual walkthrough: settings → paste real offer → extract (with and without claude available) → confirm → track → close → churn countdown
- [x] 6.2 README: setup (Node version pin for better-sqlite3), run commands, `data.db` is the entire state (copy = backup), Claude Code optional for search
