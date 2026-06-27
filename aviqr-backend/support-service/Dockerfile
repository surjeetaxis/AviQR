# ── Stage 1: Build ────────────────────────────────────────────────────────────
# Builds the JAR inside Docker — no local Java or Gradle required.
# Context must be the aviqr-backend/ root directory (set in docker-compose.yml).
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /workspace

# Copy Gradle wrapper + root config (cached until these change)
COPY gradlew .
COPY gradle ./gradle
COPY settings.gradle .
COPY build.gradle .

# Copy only this service's build.gradle (cached until it changes)
COPY support-service/build.gradle ./support-service/

# Resolve dependencies (separate cached layer)
RUN chmod +x ./gradlew && \
    ./gradlew :support-service:dependencies --no-daemon -q --continue 2>&1 | tail -5 || true

# Copy source and build
COPY support-service/src ./support-service/src
RUN ./gradlew :support-service:bootJar -x test --no-daemon --parallel

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S aviqr && adduser -S aviqr -G aviqr
COPY --from=build --chown=aviqr:aviqr /workspace/support-service/build/libs/*.jar app.jar
USER aviqr
EXPOSE 8090
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:8090/actuator/health || exit 1
ENTRYPOINT ["java", "--enable-preview", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-jar", "app.jar"]
