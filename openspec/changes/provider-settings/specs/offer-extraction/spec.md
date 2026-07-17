# offer-extraction (delta)

## ADDED Requirements

### Requirement: Multi-provider settings with one active provider
Settings SHALL present a list of LLM providers — presets (DeepSeek, OpenAI, Qwen, Kimi, Gemini, OpenRouter, Groq, Ollama) and user-added custom entries — each persisting its own base URL, API key, and chosen model. Exactly one provider SHALL be marked active; extraction and free gap search SHALL use the active provider's credentials. Existing single-triple settings SHALL migrate into a provider entry automatically.

#### Scenario: Switch providers without retyping
- **WHEN** the user has configured DeepSeek and Kimi and switches the active provider from DeepSeek to Kimi
- **THEN** extraction immediately uses Kimi's saved key and model, and switching back restores DeepSeek's without re-entry

#### Scenario: Legacy settings migrate
- **WHEN** the app starts with only the old base_url/model/api_key rows
- **THEN** they appear as a configured provider entry and extraction behavior is unchanged

### Requirement: Connectivity test and live model list
Settings SHALL offer a connectivity test per provider that calls the provider's OpenAI-compatible `/models` endpoint through the server. A successful test SHALL report success and populate a model dropdown with the returned model ids; failure SHALL show the error. Manual model entry MUST remain possible for providers without a `/models` endpoint.

#### Scenario: Test fills the dropdown
- **WHEN** the user clicks 测试连通性 with a valid DeepSeek key
- **THEN** a success indicator appears and 选择模型 lists the provider's live models (e.g. deepseek-v4-flash, deepseek-v4-pro)

#### Scenario: Bad key reported
- **WHEN** the key is invalid
- **THEN** the test shows the provider's error and the previously saved model remains untouched

#### Scenario: No /models endpoint
- **WHEN** a custom proxy returns 404 for /models
- **THEN** the user can still type a model name and save
