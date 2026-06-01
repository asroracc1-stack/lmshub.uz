# -------------------------------------------------
# 1️⃣ Build stage – Maven Wrapper (JDK 21)
# -------------------------------------------------
FROM maven:3.9.9-eclipse-temurin-21 AS build

WORKDIR /app

# Copy pom.xml and source
COPY java-backend/pom.xml .
COPY java-backend/src ./src

# Build the application using Maven pre-installed in the base image
RUN mvn -B clean package -DskipTests

# -------------------------------------------------
# 2️⃣ Runtime stage – slim JRE 21
# -------------------------------------------------
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copy the built JAR from the build stage
COPY --from=build /app/target/*.jar app.jar

# Railway provides $PORT; fallback to 8080 for local runs
EXPOSE ${PORT:-8080}

# Run Spring Boot with production profile and optimized JVM settings for 512MB RAM limit
ENTRYPOINT ["java","-Xmx256m","-Xss512k","-XX:CICompilerCount=2","-XX:+UseSerialGC","-Dspring.profiles.active=production","-jar","/app/app.jar"]