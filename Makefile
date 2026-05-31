ENV_FILE := .env.local

dev:
	docker compose --env-file $(ENV_FILE) -f docker-compose.dev.yml up

up:
	docker compose --env-file $(ENV_FILE) up --build -d

down:
	docker compose down

logs:
	docker compose logs -f

rebuild:
	docker compose --env-file $(ENV_FILE) build --no-cache
	docker compose --env-file $(ENV_FILE) up -d

addon-build:
	docker build -f ha-addon/Dockerfile -t lanfarer-addon .

addon-build-local:
	docker build -f Dockerfile -t lanfarer-addon-local .

addon-run: addon-build-local
	docker run --rm \
	  --network host \
	  -v $(PWD)/config.yaml:/data/config.yaml:ro \
	  -p 5176:5176 \
	  --entrypoint sh \
	  lanfarer-addon-local \
	  -c 'mkdir -p /data && echo "{}" > /data/options.json && NODE_ENV=production TSX_TSCONFIG_PATH=/app/tsconfig.node.json /app/node_modules/.bin/tsx /app/server/index.ts'

.PHONY: dev up down logs rebuild addon-build addon-build-local addon-run
