FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY build/libs/*.jar app.jar
EXPOSE 8092
ENTRYPOINT ["java", "--enable-preview", "-jar", "app.jar"]
