.PHONY: build-all build run-auth run-shop run-gateway run-registry db-shell mongo-shell redis-cli rabbitmq-ui eureka-ui test test-svc wrapper

# ── Build all services ─────────────────────────────────────────────────────────
build-all:
	./gradlew build -x test

build:
	./gradlew $(SVC):build -x test

# ── Run specific service locally (requires infra up — see ./aviqr.sh check) ───
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
	psql -U aviqr -d aviqr_auth

mongo-shell:
	mongosh -u aviqr -p aviqr_secret --authenticationDatabase admin

redis-cli:
	redis-cli -a aviqr_redis_secret

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
	gradle wrapper --gradle-version 8.10.2
