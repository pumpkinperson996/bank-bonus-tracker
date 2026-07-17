# Build stage: install deps (better-sqlite3 uses its glibc prebuild — no toolchain needed)
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime: Next standalone output only — no full node_modules, no source
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production \
    DATA_DB_PATH=/data/data.db \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 3000
CMD ["node", "server.js"]
