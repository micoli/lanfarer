FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Serve ─────────────────────────────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/plugins ./plugins
COPY --from=builder /app/tsconfig.node.json ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production
ENV TSX_TSCONFIG_PATH=tsconfig.node.json

EXPOSE 5176

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:5176/__health || exit 1

CMD ["node_modules/.bin/tsx", "server/index.ts"]
