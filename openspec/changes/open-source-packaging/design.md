# open-source-packaging — design

## Context

Not a git repo yet. All state including the API key lives in `data.db` at the project root — one wrong `git add .` publishes a credential. Existing README is English-only and assumes the Claude-search era.

## Goals / Non-Goals

**Goals:**
- Impossible to accidentally commit secrets; safe first push
- A newcomer on Windows/macOS/Linux goes from clone to working app with only a DeepSeek (or compatible) key

**Non-Goals:**
- No Docker image, no hosted demo, no CI, no CONTRIBUTING/issue templates (add when contributors appear)
- No i18n of the app UI itself — docs only

## Decisions

1. **`.gitignore` before `git init` commit anything**; verify with `git status` that `data.db` never appears. Key rotation is a task, not a doc note — the current key has been printed in local session logs.
2. **MIT license** — maximally permissive, zero maintenance.
3. **Two full READMEs, not one mixed file** — `README.md` (EN) is what GitHub renders for the world; `README.zh-CN.md` mirrors it; each links the other at the top. Content parity maintained manually (two files, one small app — acceptable).
4. **Docs lead with the free path**: DeepSeek key + free search = full functionality; Claude Code CLI documented as an optional accuracy fallback. Include the tested cost figure (~$0.002/offer) and provider-swap table (Kimi/Qwen/OpenRouter/Ollama base URLs).

## Risks / Trade-offs

- [Bilingual docs drift] → parity is a review-time convention; small surface
- [data.db schema surprises for cloners] → first run auto-creates it; README states "the file is the entire state" (already true today)
