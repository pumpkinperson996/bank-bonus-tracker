# docker-packaging — design

## Context

App is a Next.js 15 server with one native dep (better-sqlite3) and one state file (`data.db`, path already overridable via `DATA_DB_PATH`). Claude CLI dependency is gone, so the container needs nothing but Node.

## Goals / Non-Goals

**Goals:**
- `docker run -v` starts a working app with persistent state; image pullable from GHCR
- Small image, no compile toolchain in the final layer

**Non-Goals:**
- No multi-arch beyond amd64+arm64 defaults of buildx; no k8s manifests; no HTTPS/reverse-proxy (localhost tool)

## Decisions

1. **node:24-slim (Debian/glibc) over alpine** — better-sqlite3 ships glibc prebuilds; alpine/musl risks a node-gyp compile and needs python3/make/g++ in the build stage. Slim keeps stages toolchain-free.
2. **Next `output: 'standalone'`** — the runner copies `.next/standalone` + `.next/static`; standalone bundles exactly the node_modules the server needs (including the .node binary), no full `npm ci` in the final image.
3. **State volume at `/data`** — `DATA_DB_PATH=/data/data.db` baked as env default; compose mounts `./data:/data`. Runs as the `node` user; `/data` chown'd at build.
4. **GHCR via Actions** (`docker/build-push-action`) on master + `v*` tags, tagged `latest` + version. GITHUB_TOKEN has packages:write; package visibility follows repo (private now, public when the repo flips).

## Risks / Trade-offs

- [Image private while repo private] → expected; flipping the repo public exposes the package after one visibility toggle
- [buildx arm64 emulation slow in CI] → acceptable for a small app; can drop arm64 if CI time matters
