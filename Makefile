## DEVELOPMENT ##
COMPOSE_DEV=docker-compose.dev.yml

up-dev:
	docker compose -f $(COMPOSE_DEV) up --build

down-dev:
	docker compose -f $(COMPOSE_DEV) down

#################

# Docker Compose commands
up:
	docker compose -f docker-compose.yml up -d

down:
	docker compose -f docker-compose.yml down

pull:
	docker compose -f docker-compose.yml pull

restart: down pull up

logs:
	docker compose -f docker-compose.yml logs -f

ps:
	docker compose -f docker-compose.yml ps

clean:
	docker compose -f docker-compose.yml down -v
	docker system prune -af --volumes
