# Bank Bonus Tracker

**English** | [中文](README.md)

A local-only web app for tracking US bank account opening bonuses. Paste an offer link (or many at once), an LLM extracts the details — bank, bonus amount, direct-deposit requirements, deadline, monthly fee, churn rules — and the app tracks your opened accounts with automatic countdowns for DD deadlines, safe-close dates, and churn cooldowns.

Everything runs on your machine. The only network calls are to the LLM API you configure and a free web search for churn rules. Typical cost: **about $0.002 per offer analyzed** with DeepSeek V4 Flash.

## Features

- **Paste a link, get a filled form** — the offer page is fetched and an LLM extracts every field, including multiple bonus tiers ($300 checking / $200 savings / $900 combined each become a choice)
- **Free churn-rule search** — when the offer page doesn't say whether the bonus is repeatable, a keyless multi-engine web search (DuckDuckGo → Bing → DuckDuckGo Lite, favoring Doctor of Credit and Reddit r/churning) plus your LLM fills the gaps, labeled with the source
- **Batch add** — paste many links (one per line); they're analyzed one by one while you review the first
- **Tracking dashboard** — days open, DD progress with per-deposit log, DD deadline with overdue/due-soon badges, monthly fee at a glance, safe-close date, churn cooldown countdown; responsive table on desktop, cards on mobile
- **Application outcomes and actual payouts** — mark an offer ineligible or denied, require its reason and date, and automatically show days since denial; record actual payouts and see the total received bonus
- **Compound eligibility rules** — current-account, account-history, bonus-history, membership, calendar, household, and lifetime restrictions remain separate; rules anchored to opening, closing, or bonus receipt get independent live countdowns
- **Historical account entry** — capture old open, close, bonus dates, and actual amount in one step without applying the current offer's DD/hold workflow; eligibility uses the bank's newest relevant history
- **Expiry and hold countdowns** — the desktop table header stays visible while scrolling, with dedicated offer-expiry, verified minimum-hold, and live safe-close countdowns
- **Bank sections and closure methods** — split the catalog into nationwide and regional banks using Bank Bonus Wizard scope data, with bank-specific DoC closure instructions and source links where verified
- **Local data** — a single SQLite file; copy it to back up, delete it to reset

## Requirements

- **Node.js 24** — `better-sqlite3` compiles a native module against the installed Node; if you switch Node versions later, run `npm rebuild better-sqlite3`
- **An OpenAI-compatible LLM API key** — DeepSeek by default (cheap and accurate for this task); Kimi, Qwen, OpenRouter, or a local Ollama all work by changing the base URL

## Install & Run

### Docker (recommended)

No Node, no build tools — just Docker:

```bash
docker run -d -p 3000:3000 -v ./data:/data ghcr.io/pumpkinperson996/bank-bonus-tracker:latest
# or, from a clone:
docker compose up -d
```

Open http://localhost:3000. All state (including your API key) lives in the mounted `./data` folder — back it up by copying the folder. Upgrading = pull the new image and recreate the container; your data folder carries over.

### From source

Requires Node 24 (see Requirements above):

```bash
git clone <this-repo>
cd bankdd
npm install
npm run dev        # development, http://localhost:3000
# or production:
npm run build && npm start
```

The database file `data.db` is created automatically on first run.

## Setup

Open **Settings** in the app and enter:

| Setting | Default | Notes |
|---|---|---|
| Base URL | `https://api.deepseek.com` | Any OpenAI-compatible `/chat/completions` endpoint |
| Model | `deepseek-v4-flash` | See alternatives below |
| API key | *(empty)* | Stored locally in `data.db`, never leaves your machine except to call the API |

Provider alternatives (change Base URL + Model, keep everything else):

| Provider | Base URL | Example model |
|---|---|---|
| DeepSeek | `https://api.deepseek.com` | `deepseek-v4-flash` |
| Moonshot (Kimi) | `https://api.moonshot.cn/v1` | `kimi-k2` |
| Alibaba (Qwen) | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-max` |
| OpenRouter | `https://openrouter.ai/api/v1` | any listed model |
| Ollama (local) | `http://localhost:11434/v1` | `llama3.3` etc. |

> Note: DeepSeek's legacy model names `deepseek-chat` / `deepseek-reasoner` are deprecated as of 2026-07-24. If your saved settings still contain one, the app migrates it to `deepseek-v4-flash` automatically.

## Usage

1. **New offer** — paste a bonus page URL, several URLs (one per line) for batch mode, or plain offer text. Click **Analyze**. Review the pre-filled form (pick your tier if the page has several), correct anything, save. Manual entry works with no API key at all.
2. **Dashboard** — when you open an account, click **+开户** under the offer. Log each direct deposit as it lands, tick the checkbox when the bonus posts, close the account when it's safe. Days open, deadlines, and cooldowns are computed automatically.
3. **Churn fields** — if the page didn't state churn rules, the free search fills them with a source note like "From Doctor of Credit: churnable after 12 months". Values from search never overwrite what the page itself said.

Edit an offer to set its application outcome. Denied applications require a reason, and returning to unreviewed clears the old reason. When a bonus posts, tick the account's received box: the advertised amount is prefilled and can be replaced with the actual payout. Clearing the checkbox clears both the received date and amount.

## How the gap search works

```
extract from page ──▶ missing churn/fee fields?
                        │no → done
                        ▼yes
             search engine chain: DuckDuckGo → Bing → DuckDuckGo Lite
             (first engine with a fetchable result page wins)
                        │pages found
                        ▼
             your LLM reads the pages and fills ONLY the missing fields
             (product/account names must literally appear in the pages)
                        │nothing found anywhere
                        ▼
             fields stay blank, fill manually in the review form
```

## Data & backup

Everything — offers, accounts, DD events, settings including your API key — lives in **`data.db`** in the project root. With Docker it is **`./data/data.db`** in the mounted host directory. That file is the entire state: copying it is a backup, deleting it is a reset. It is `.gitignore`d; never commit it.

Stop the app before copying the database. For a source checkout:

```bash
cp data.db data.db.backup-2026-07-17
```

For the default Docker mount:

```bash
cp data/data.db data/data.db.backup-2026-07-17
```

## Tests

```bash
npm test           # vitest: date math, DB persistence, extraction pipeline, free search
```

## Troubleshooting

- **`better-sqlite3` errors after a Node upgrade** → `npm rebuild better-sqlite3`
- **"Provider rejected the API key"** → re-check the key and base URL in Settings
- **Analysis succeeds but churn fields are blank** → no search engine returned a usable page (rare — three engines are tried); fill the fields manually in the review form
- **Offer page fetch blocked** (some bank sites block bots) → paste the offer text instead of the URL

## License

[MIT](LICENSE)
