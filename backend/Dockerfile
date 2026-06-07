FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml .
COPY src ./src
RUN mvn -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
ENV JAVA_OPTS="-Dquarkus.http.host=0.0.0.0"
COPY --from=build /workspace/target/quarkus-app/ ./
COPY render-start.sh /app/render-start.sh
RUN chmod +x /app/render-start.sh
EXPOSE 8080
CMD ["/app/render-start.sh"]
