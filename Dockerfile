# 1. Build bosqichi
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

# Barcha fayllarni konteynerga nusxalaymiz
COPY . .

# Maven wrapper'ni topib, to'g'ridan-to'g'ri ishga tushiramiz
RUN chmod +x java-backend/mvnw
RUN ./java-backend/mvnw clean package -f java-backend/pom.xml -DskipTests

# 2. Runtime bosqichi
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Build qilingan JAR faylni to'g'ridan-to'g'ri manzilidan olamiz
COPY --from=build /app/java-backend/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]