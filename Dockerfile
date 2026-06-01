# 1. Build bosqichi
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

# Hamma narsani nusxalab olamiz
COPY . .

# Fayllar strukturani logda tekshirish (bu xatoni topishga yordam beradi)
RUN ls -R /app

# mvnw fayli qayerda bo'lsa, o'sha joydan ishga tushiramiz
# Agar u "java-backend" ichida bo'lsa, shuni ishlat:
RUN cd java-backend && chmod +x mvnw && ./mvnw clean package -DskipTests

# 2. Runtime bosqichi
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
# Build bo'lgan jar faylni qidirib topib, app.jar deb ko'chirib olamiz
COPY --from=build /app/java-backend/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]