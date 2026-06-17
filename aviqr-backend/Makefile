.PHONY: up down build logs ps clean restart

# ── Docker Compose ─────────────────────────────────────────────────────────────
up:
	docker compose up -d

up-infra:
	docker compose up -d postgres mongo redis rabbitmq

up-registry:
	docker compose up -d service-registry

down:
	docker compose down

logs:
	docker compose logs -f --tail=100

logs-svc:
	docker compose logs -f $(SVC)

ps:
	docker compose ps

restart:
	docker compose restart $(SVC)

clean:
	docker compose down -v --remove-orphans

# ── Build all services ─────────────────────────────────────────────────────────
build-all:
	./gradlew build -x test

build:
	./gradlew $(SVC):build -x test

# ── Build Docker images ────────────────────────────────────────────────────────
docker-build:
	docker compose build

docker-build-svc:
	docker compose build $(SVC)

# ── Run specific service locally (requires infra up) ──────────────────────────
run-auth:
	./gradlew auth-service:bootRun

run-shop:
	./gradlew shop-service:bootRun

run-gateway:
	./gradlew api-gateway:bootRun

run-registry:
	./gradlew service-registry:bootRun

# ── Database ───────────────────────────────────────────────────────────────────
db-shell:
	docker exec -it aviqr-postgres psql -U aviqr -d aviqr_auth

mongo-shell:
	docker exec -it aviqr-mongo mongosh -u aviqr -p aviqr_secret

redis-cli:
	docker exec -it aviqr-redis redis-cli -a aviqr_redis_secret

rabbitmq-ui:
	@echo "RabbitMQ Management UI: http://localhost:15672 (aviqr/aviqr_secret)"
	@open http://localhost:15672 || xdg-open http://localhost:15672

eureka-ui:
	@echo "Eureka Dashboard: http://localhost:8761"
	@open http://localhost:8761 || xdg-open http://localhost:8761

# ── Test ───────────────────────────────────────────────────────────────────────
test:
	./gradlew test

test-svc:
	./gradlew $(SVC):test

# ── Generate Gradle wrapper ────────────────────────────────────────────────────
wrapper:
	gradle wrapper --gradle-version 8.8
