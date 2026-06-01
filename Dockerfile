# 1. Build stage: Maven ishlatamiz
FROM maven:3.9.9-eclipse-temurin-21 AS build

WORKDIR /app

# Loyihani to'liq nusxalaymiz (java-backend papkasi bilan birga)
COPY . .

# Maven build'ni aniq java-backend papkasi ichida bajaramiz
# -f bayrog'i pom.xml qayerdaligini ko'rsatadi
RUN mvn -f java-backend/pom.xml clean package -DskipTests

# 2. Runtime stage: Engilroq JRE
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Build qilingan jar faylni target papkasidan olamiz
COPY --from=build /app/java-backend/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-Dspring.profiles.active=production", "-jar", "app.jar"]