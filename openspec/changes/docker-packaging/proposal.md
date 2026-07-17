# docker-packaging

## Why

Open-source users currently need Node 24 and a native-module build environment (better-sqlite3). A published Docker image reduces setup to one `docker run` — no Node, no toolchain, no version pitfalls.

## What Changes

- Multi-stage `Dockerfile` (Next.js standalone output, node:24-slim, prebuilt better-sqlite3 binary) producing a self-contained image; SQLite state lives on a mounted volume via the existing `DATA_DB_PATH` env
- `docker-compose.yml` one-liner run; `.dockerignore` keeps secrets/state out of build context
- GitHub Actions workflow builds and pushes `ghcr.io/pumpkinperson996/bank-bonus-tracker` on master pushes and version tags — users pull instead of building
- README (EN/zh) gains a Docker quickstart as the recommended install path

## Capabilities

### Modified Capabilities

- `distribution`: repository ships a runnable container image and documents the Docker path

## Impact

- New: `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `.github/workflows/docker.yml`, `next.config.ts` (standalone output)
- READMEs updated; no application code changes
