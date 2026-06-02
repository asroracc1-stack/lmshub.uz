# -------------------------------------------------
# 1️⃣ Build stage – Maven (JDK 17, pom.xml'dagi versiyaga mos)
# -------------------------------------------------
FROM maven:3.9.9-eclipse-temurin-17 AS build

WORKDIR /app

# pom.xml'ni alohida ko'chirib, dependency'larni keshlaymiz
COPY java-backend/pom.xml .
RUN mvn -B dependency:go-offline

# Faqat source kodini ko'chirib, build qilamiz
COPY java-backend/src ./src
RUN mvn -B clean package -DskipTests

# -------------------------------------------------
# 2️⃣ Runtime stage – slim JRE 17
# -------------------------------------------------
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Build stage'dan tayyor JAR'ni olamiz
COPY --from=build /app/target/*.jar app.jar

# Railway $PORT muhit o'zgaruvchisini beradi
EXPOSE ${PORT:-8080}

# ========================================================
# Railway Free Tier (512 MB) uchun optimallashtirilgan JVM
# ========================================================
# -Xmx200m     : Max heap 200MB (qolganini JVM metaspace, thread uchun)
# -Xms100m     : Boshlang'ich heap 100MB (tez start uchun)
# -Xss256k     : Thread stack 256KB (default 1MB, tejash)
# -XX:MaxMetaspaceSize=100m : Metaspace cheklash
# -XX:+UseSerialGC          : Eng kam memory ishlatadigan GC
# -XX:CICompilerCount=2     : JIT compiler threadlarini kamaytirish
# -XX:+TieredCompilation    : Tezroq startup
# -XX:TieredStopAtLevel=1   : Full optimization'ni o'chirish (RAM tejash)
# ========================================================
ENTRYPOINT ["java", \
  "-Xmx200m", \
  "-Xms100m", \
  "-Xss256k", \
  "-XX:MaxMetaspaceSize=100m", \
  "-XX:+UseSerialGC", \
  "-XX:CICompilerCount=2", \
  "-XX:+TieredCompilation", \
  "-XX:TieredStopAtLevel=1", \
  "-Dspring.profiles.active=production", \
  "-jar", "/app/app.jar"]