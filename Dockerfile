# 1. Build stage: Maven ishlatamiz
FROM maven:3.9.9-eclipse-temurin-21 AS build

WORKDIR /app

# Loyihani to'liq nusxalaymiz (java-backend papkasi bilan birga)
COPY . .

# Maven build'ni aniq java-backend papkasi ichida bajaramiz
# -f bayrog'i pom.xml qayerdaligini ko'rsatadi
RUN mvn -f java-backend/pom.xml clean package -DskipTests

# 2. Runtime stage: Engilroq JRE
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Build qilingan jar faylni target papkasidan olamiz
COPY --from=build /app/java-backend/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-Dspring.profiles.active=production",# 1. Build bosqichi (Java 21 va Maven 3.9)
FROM maven:3.9.9-eclipse-temurin-21 AS build

# Konteyner ichida ishchi papkani belgilaymiz
WORKDIR /app

# GitHub'dagi hamma faylni konteynerga ko'chiramiz
COPY . .

# Maven build'ni aniq 'java-backend' papkasiga kirib bajaramiz
# -f bayrog'i aniq pom.xml manzilini ko'rsatadi
RUN mvn -f java-backend/pom.xml clean package -DskipTests

# 2. Runtime bosqichi (Kichikroq va xavfsizroq)
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Build qilingan .jar faylni target papkasidan olamiz
# Agar target papkasi ichida bir nechta jar bo'lsa, "app.jar" deb nusxalaymiz
COPY --from=build /app/java-backend/target/*.jar app.jar

# Railway uchun kerakli port
EXPOSE 8080

# Dasturni ishga tushirish
ENTRYPOINT ["java", "-jar", "app.jar"] "-jar", "app.jar"]