#!/usr/bin/env sh
set -eu

if [ -n "${DATABASE_URL:-}" ] && [ -z "${QUARKUS_DATASOURCE_JDBC_URL:-}" ]; then
  database_url="${DATABASE_URL#postgresql://}"
  database_url="${database_url#postgres://}"

  credentials="${database_url%@*}"
  host_and_database="${database_url#*@}"

  export QUARKUS_DATASOURCE_USERNAME="${credentials%%:*}"
  export QUARKUS_DATASOURCE_PASSWORD="${credentials#*:}"

  database_host="${host_and_database%%/*}"
  database_name="${host_and_database#*/}"
  database_name="${database_name%%\?*}"
  export QUARKUS_DATASOURCE_JDBC_URL="jdbc:postgresql://${database_host}/${database_name}"
fi

exec java ${JAVA_OPTS:-} -jar quarkus-run.jar
