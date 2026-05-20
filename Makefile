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
	docker build -f ha-addon/Dockerfile -t fast5688b-gui-addon .

.PHONY: dev up down logs rebuild addon-build
