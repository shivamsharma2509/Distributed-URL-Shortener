FROM maven:3.9.9-eclipse-temurin-21 AS build

WORKDIR /app
COPY artifacts/api-server/pom.xml artifacts/api-server/pom.xml
RUN mvn -q -f artifacts/api-server/pom.xml dependency:go-offline
COPY artifacts/api-server/src artifacts/api-server/src
RUN mvn -q -f artifacts/api-server/pom.xml -DskipTests package

FROM eclipse-temurin:21-jre

WORKDIR /app
COPY --from=build /app/artifacts/api-server/target/shortstack-api-0.0.1-SNAPSHOT.jar app.jar

ENV PORT=5000
EXPOSE 5000
ENTRYPOINT ["java", "-jar", "app.jar"]