# -------------------------------------------------
# 1️⃣ Build stage – JDK 21 + Maven wrapper
# -------------------------------------------------
FROM eclipse-temurin:21-jdk-alpine AS build

# Working directory inside the image
WORKDIR /app

# -----------------------------------------------------------------
# Copy the Maven wrapper that lives inside the java‑backend sub‑module
# -----------------------------------------------------------------
COPY java-backend/mvnw .
COPY java-backend/.mvn .mvn
COPY java-backend/pom.xml .

# Make the wrapper executable (Windows ↔ Linux line‑ending issue)
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

# -----------------------------------------------------------------
# Copy the source tree of the java‑backend module
# -----------------------------------------------------------------
COPY java-backend/src src

# Build the fat‑jar (skip tests – Railway will run CI if you need them)
RUN ./mvnw clean package -DskipTests -B

# -------------------------------------------------
# 2️⃣ Runtime stage – JRE 21 (slim)
# -------------------------------------------------
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Pull the built jar from the previous stage
COPY --from=build /app/target/*.jar app.jar

# Railway injects the listening port via the $PORT env‑var.
# Keep a fallback (8080) for local testing.
EXPOSE ${PORT:-8080}

# Start Spring Boot with the *production* profile
ENTRYPOINT ["java","-Dspring.profiles.active=production","-jar","/app/app.jar"]
