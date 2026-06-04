# -------------------------------------------------
# 1. Build stage - Maven (JDK 17)
# -------------------------------------------------
FROM maven:3.9.9-eclipse-temurin-17 AS build

WORKDIR /app

# Cache Maven dependencies first.
COPY java-backend/pom.xml .
RUN mvn -B dependency:go-offline

# Copy source and build only the Java backend.
COPY java-backend/src ./src
RUN mvn -B clean package -DskipTests

# -------------------------------------------------
# 2. Runtime stage - slim JRE 17
# -------------------------------------------------
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE ${PORT:-8080}

# Railway provides a dynamic PORT. The memory settings are tuned for a 512 MB
# container while leaving Spring Boot, Hibernate, and Liquibase enough heap to
# start reliably.
ENTRYPOINT ["sh", "-c", "java -Xms64m -Xmx320m -Xss512k -XX:MaxMetaspaceSize=160m -XX:+UseSerialGC -XX:CICompilerCount=2 -XX:+TieredCompilation -XX:TieredStopAtLevel=1 -XX:+ExitOnOutOfMemoryError -Dserver.port=${PORT:-8080} -Dspring.profiles.active=${SPRING_PROFILES_ACTIVE:-production} -jar /app/app.jar"]
