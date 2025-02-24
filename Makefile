.PHONY: build run all frontend clean restart

build:
	@echo "Building Docker containers..."
	docker-compose build

run:
	@echo "Running the application..."
	@docker-compose down --remove-orphans > /dev/null 2>&1 || true
	@docker container rm -f python_backend > /dev/null 2>&1 || true
	docker-compose up

stop:
	docker-compose down --remove-orphans

restart: stop run

# Database
db-shell:
	docker-compose exec db psql -U beyondmeet -d beyondmeet

# Backend
backend-shell:
	docker-compose exec python_backend /bin/bash

backend-logs:
	docker-compose logs -f python_backend

# Frontend
frontend-shell:
	docker-compose exec frontend /bin/sh

frontend-logs:
	docker-compose logs -f frontend

# Redis
redis-shell:
	docker-compose exec redis redis-cli

redis-logs:
	docker-compose logs -f redis

# Cleanup
clean:
	@echo "Cleaning up containers and volumes..."
	docker-compose down -v
	docker system prune -f
	@echo "Cleanup complete"

frontend-install:
	@echo "Installing frontend dependencies..."
	cd frontend && npm install

dev: clean build frontend-install run
