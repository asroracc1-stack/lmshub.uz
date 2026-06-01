# 1. Build bosqichi
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

# GitHub repozitoriyadagi barcha fayllarni Docker konteyneriga ko'chiramiz
COPY . .

# `java-backend` ichidagi mvnw faylini to'g'ridan-to'g'ri manzil bo'yicha ishga tushiramiz
RUN chmod +x /app/java-backend/mvnw
RUN /app/java-backend/mvnw clean package -f /app/java-backend/pom.xml -DskipTests

# 2. Runtime bosqichi
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Build qilingan JAR faylni to'g'ridan-to'g'ri manzilidan olamiz
COPY --from=build /app/java-backend/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]