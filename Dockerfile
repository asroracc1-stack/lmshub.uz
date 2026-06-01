FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY java-backend/mvnw .
COPY java-backend/.mvn .mvn
COPY java-backend/pom.xml .
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B
COPY java-backend/src src
RUN ./mvnw clean package -DskipTests -B

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE ${PORT:-8080}
ENTRYPOINT ["java","-Dspring.profiles.active=production","-jar","/app/app.jar"]
