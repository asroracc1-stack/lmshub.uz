# -------------------------------------------------
# 1️⃣ Build stage – Maven (JDK 21)
# -------------------------------------------------
FROM maven:3.9.9-eclipse-temurin-21 AS build

WORKDIR /app

# Copy only the backend module (pom and src)
COPY java-backend/pom.xml .
COPY java-backend/src ./src

# Resolve dependencies (cached) and build the jar
RUN mvn -B dependency:go-offline
RUN mvn -B clean package -DskipTests

# -------------------------------------------------
# 2️⃣ Runtime stage – slim JRE 21
# -------------------------------------------------
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copy the JAR produced in the build stage
COPY --from=build /app/target/*.jar app.jar

# Railway provides $PORT; fallback to 8080 for local runs
EXPOSE ${PORT:-8080}

# Run Spring Boot with production profile
ENTRYPOINT ["java","-Dspring.profiles.active=production","-jar","/app/app.jar"]