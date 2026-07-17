# open-source-packaging

## Why

The project is going on GitHub for others to use. It is not yet a git repository, `data.db` contains the owner's real API key, and there is only a terse English README — publishing today would leak a credential and leave newcomers without setup guidance.

## What Changes

- `.gitignore` protecting `data.db` (holds the API key), `node_modules/`, `dev.log`, `*.tsbuildinfo`, `.next/`
- Owner rotates the DeepSeek API key before first push (current key has appeared in local logs)
- MIT `LICENSE`
- Detailed bilingual docs: `README.md` (English) + `README.zh-CN.md` (Chinese), cross-linked — requirements (Node 24, better-sqlite3 rebuild gotcha), install/run/build, Settings walkthrough (base URL/model/key, provider alternatives), free search vs optional Claude search, batch add, data/backup model, troubleshooting
- git init + initial commit

## Capabilities

### New Capabilities

- `distribution`: what the published repository must contain and must never contain

### Modified Capabilities

(none)

## Impact

- New files only (`.gitignore`, `LICENSE`, `README.zh-CN.md`); `README.md` rewritten/expanded
- No code changes; assumes `free-search-deepseek` lands first so the docs can present a no-subscription default path
