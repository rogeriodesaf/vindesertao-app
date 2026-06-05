FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml .
COPY src ./src
RUN mvn -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
ENV JAVA_OPTS="-Dquarkus.http.host=0.0.0.0"
COPY --from=build /workspace/target/quarkus-app/ ./
EXPOSE 8080
CMD ["sh", "-c", "java $JAVA_OPTS -jar quarkus-run.jar"]
