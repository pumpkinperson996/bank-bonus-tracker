# provider-settings — tasks

## 1. Storage

- [x] 1.1 `lib/types.ts`: `Provider` type + preset list constant; `lib/db.ts`: `getProviderSettings`/`saveProviderSettings` (providers + active_provider JSON rows); `getSettings()` resolves active provider (with deprecated-model mapping), falls back to and seeds from legacy keys
- [x] 1.2 db tests: legacy fallback unchanged, seed-on-first-read, active-provider resolution, switch active

## 2. API

- [x] 2.1 `app/api/settings/route.ts`: GET/PUT `{providers, active_provider, search_model}`
- [x] 2.2 `app/api/models/route.ts`: POST proxy to `{base_url}/models`, returns model ids or error

## 3. Settings UI

- [x] 3.1 Rebuild `app/settings/page.tsx`: provider sidebar (presets + custom + 使用中 badge), per-provider form (API地址/API Key/测试连通性/选择模型 dropdown + manual input/设为使用中/保存), search-model field kept; styles in globals.css

## 4. Verify

- [x] 4.1 tsc + `npm test` green; live: test connectivity against real DeepSeek key, model dropdown populates, switch model, run one extraction with the chosen model
