FROM maven:3.9-eclipse-temurin-17 AS build
LABEL org.opencontainers.image.title="sport-club-system backend"
WORKDIR /app/backend
COPY backend/pom.xml backend/mvnw backend/mvnw.cmd ./
COPY backend/.mvn ./.mvn
RUN chmod +x mvnw
COPY VERSION /app/VERSION
COPY backend/src ./src
RUN ./mvnw -B -ntp -DskipTests package

FROM eclipse-temurin:17-jre-jammy AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/* && groupadd --system app && useradd --system --gid app app
COPY --from=build --chown=app:app /app/backend/target/*.jar /app/app.jar
USER app
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
