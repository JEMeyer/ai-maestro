# Project settings
COMPOSE_DEV=docker-compose.dev.yml
COMPOSE_PROD=docker-compose.yml

# Docker Compose commands
up-dev:
	docker compose -f $(COMPOSE_DEV) up --build

down-dev:
	docker compose -f $(COMPOSE_DEV) down

up-prod:
	docker compose -f $(COMPOSE_PROD) up --build -d

down-prod:
	docker compose -f $(COMPOSE_PROD) down

logs:
	docker compose -f $(COMPOSE_DEV) logs -f

ps:
	docker compose -f $(COMPOSE_DEV) ps

clean:
	docker compose -f $(COMPOSE_DEV) down -v
	docker compose -f $(COMPOSE_PROD) down -v
	docker system prune -af --volumes
