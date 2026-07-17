# distribution (spec)

## ADDED Requirements

### Requirement: No secrets in the repository
The published repository MUST NOT contain `data.db`, API keys, logs, or build artifacts. `.gitignore` SHALL cover `data.db`, `node_modules/`, `.next/`, `dev.log`, and `*.tsbuildinfo` before the first commit.

#### Scenario: Accidental add
- **WHEN** a contributor runs `git add .` in a working directory with a populated `data.db`
- **THEN** `data.db` is not staged

### Requirement: Bilingual deployment and usage documentation
The repository SHALL provide `README.md` (English) and `README.zh-CN.md` (Chinese) with equivalent content, each linking to the other. Both SHALL cover: requirements (Node 24, better-sqlite3 rebuild note), install/run/build commands, Settings configuration (base URL, model, API key, provider alternatives), the free search path as the default with Claude Code CLI as optional, batch link adding, the data/backup model, and troubleshooting.

#### Scenario: New user, Chinese
- **WHEN** a Chinese-speaking user opens the repo
- **THEN** one click from the README top reaches complete setup instructions in Chinese

#### Scenario: No Claude subscription
- **WHEN** a user follows the README with only a DeepSeek API key
- **THEN** every documented feature works, and the docs identify Claude search as optional

### Requirement: Open-source license
The repository SHALL include an MIT `LICENSE` file.

#### Scenario: License visible
- **WHEN** the repo is viewed on GitHub
- **THEN** GitHub identifies the project as MIT-licensed
