FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

# Hamma narsani nusxalab olamiz
COPY . .

# `ls -R` qo'shib tekshiramiz (bu logda qayerda nima borligini ko'rsatadi)
RUN ls -R /app

# Endi `mvnw` qayerda bo'lsa, o'sha yerga kirib build qilamiz
# Agar u `java-backend` ichida bo'lsa, shuni ishlat:
RUN cd java-backend && chmod +x mvnw && ./mvnw clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
# Build bo'lgan jar faylni ko'chiramiz
COPY --from=build /app/java-backend/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]