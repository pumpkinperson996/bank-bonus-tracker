# provider-settings — design

## Context

`settings` is a key-value table; `getSettings()` returns `{base_url, model, api_key, search_model}` consumed by llm/free-search/pipeline. The reference screenshot shows a provider sidebar with per-provider credentials, connectivity test, and a live model dropdown.

## Goals / Non-Goals

**Goals:**
- Switch providers without re-typing keys; pick models from the provider's real list
- Pipeline untouched: it keeps reading one resolved `Settings`

**Non-Goals:**
- No multiple simultaneously-enabled models (the app uses exactly one extraction model) — the screenshot's per-provider toggles/启用模型 chips collapse to one 使用中 provider with one chosen model
- No provider logos, no key encryption (data.db is already the trust boundary)

## Decisions

1. **Storage: two new settings rows** — `providers` (JSON array of `{name, base_url, api_key, model}`) and `active_provider` (name). No schema migration needed (key-value table). `getSettings()` resolves the active provider into the legacy shape, applying the deprecated-model mapping; when no providers row exists it falls back to legacy keys and seeds a provider entry from them (named DeepSeek when base_url matches, else 自定义).
2. **`POST /api/models` proxy** with `{base_url, api_key}` → server fetches `{base_url}/models` (OpenAI-compatible), returns `{models: string[]}` or `{error}`. One endpoint serves both 测试连通性 (it succeeded = connected) and 刷新模型 (its payload = dropdown options). 20s timeout. Server-side because browsers hit CORS on provider APIs.
3. **Presets are UI constants** (name + base_url + suggested default model), not DB rows: the DB only stores providers the user actually touched. Selecting a preset pre-fills base_url; Ollama preset needs no key (send empty Bearer).
4. **`/api/settings` new shape**: GET/PUT `{providers, active_provider, search_model}`. The settings page is its only consumer. `saveSettings` (legacy) remains for tests/back-compat.
5. **Model field**: `<select>` populated from the last successful /models call, with a free-text fallback input (提供商没实现 /models 时手动输入).

## Risks / Trade-offs

- [/models unsupported by some proxies] → error shown, manual model input still works
- [SSRF via arbitrary base_url in proxy] → local single-user app, same exposure as the extraction call itself; no extra guard
- [Legacy tests expect old getSettings behavior] → fallback path preserves it when no providers row exists
