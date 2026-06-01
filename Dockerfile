# -------------------------------------------------
# 1️⃣ Build stage – JDK 21 + Maven wrapper
# -------------------------------------------------
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

# Copy Maven wrapper, .mvn, and pom.xml from the java-backend sub‑module
COPY java-backend/mvnw .
COPY java-backend/.mvn .mvn
COPY java-backend/pom.xml .

# Make wrapper executable and cache dependencies
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

# Copy source code of the backend module
COPY java-backend/src src

# Build the fat‑jar (skip tests)
RUN ./mvnw clean package -DskipTests -B

# -------------------------------------------------
# 2️⃣ Runtime stage – JRE 21 (slim)
# -------------------------------------------------
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Pull the JAR from the build stage
COPY --from=build /app/target/*.jar app.jar

# Railway provides $PORT; fallback to 8080 for local runs
EXPOSE ${PORT:-8080}

# Start Spring Boot with the production profile
ENTRYPOINT ["java","-Dspring.profiles.active=production","-jar","/app/app.jar"]
