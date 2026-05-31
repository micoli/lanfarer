FROM node:22-alpine AS builder

RUN apk add --no-cache git

# Bust Docker cache when main branch changes
ADD https://api.github.com/repos/micoli/lanfarer/git/refs/heads/main /dev/null

RUN git clone --depth 1 --branch main https://github.com/micoli/lanfarer /app

WORKDIR /app
RUN npm ci && npm run build

# ── Runtime ────────────────────────────────────────────────────────────────────
FROM node:22-alpine

RUN apk add --no-cache jq

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/plugins ./plugins
COPY --from=builder /app/tsconfig.node.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

COPY run.sh /run.sh
RUN chmod +x /run.sh

CMD ["/run.sh"]
