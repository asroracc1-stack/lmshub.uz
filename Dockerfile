FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

# GitHub'dagi barcha fayllarni konteynerga nusxalaymiz
COPY . .

# Maven wrapper'ga o'tamiz va build qilamiz
WORKDIR /app/java-backend
RUN chmod +x mvnw
RUN ./mvnw clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
# Build bo'lgan jar faylni topib olamiz
COPY --from=build /app/java-backend/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]