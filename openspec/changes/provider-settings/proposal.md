# provider-settings

## Why

Settings currently exposes one bare base_url/model/api_key triple: switching providers means re-typing everything, model names must be known in advance, and there is no way to check a key works before analyzing an offer. The user wants the familiar multi-provider settings UX (provider list, per-provider credentials, test connectivity, live model dropdown).

## What Changes

- Provider list in Settings: preset providers (DeepSeek, OpenAI, Qwen, Kimi, Gemini, OpenRouter, Groq, Ollama) plus custom entries; each stores its own base URL, API key, and chosen model
- Exactly one provider is 使用中 (active) — the extraction pipeline reads the active provider's credentials (pipeline code unchanged)
- 测试连通性: server-proxied call to the provider's `/models` endpoint; success doubles as the live model list for a real dropdown (刷新模型)
- Legacy single-triple settings migrate automatically into a provider entry on first read
- Search model (Claude Code) stays a separate labeled field, unchanged

## Capabilities

### Modified Capabilities

- `offer-extraction`: settings requirements change from a single model triple to a provider list with one active entry, connectivity test, and provider-fetched model choices

## Impact

- `lib/types.ts` (Provider types), `lib/db.ts` (providers storage + derive active → legacy Settings), `app/api/settings/route.ts` (new shape), new `app/api/models/route.ts` (proxy for /models), `app/settings/page.tsx` (rebuild), `globals.css`
- `lib/llm.ts`, `lib/free-search.ts`, `lib/pipeline.ts` untouched — they keep consuming derived `Settings`
