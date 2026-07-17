# docker-packaging — tasks

## 1. Image

- [x] 1.1 `next.config.ts` (output standalone); multi-stage `Dockerfile` (node:24-slim, /data volume, node user); `.dockerignore` (data.db, node_modules, .next, .git, openspec, dev logs)
- [x] 1.2 `docker-compose.yml`: port 3000, ./data:/data volume

## 2. Publish & docs

- [x] 2.1 `.github/workflows/docker.yml`: buildx → GHCR (latest + tag) on master/v* pushes
- [x] 2.2 README.md + README.zh-CN.md: Docker quickstart (pull/run/compose, volume = backup) as recommended path

## 3. Verify

- [x] 3.1 Local `docker build` succeeds; container runs with temp volume; offer POST/GET works; data.db lands on the volume; data.db absent from image; `npm test` still green
