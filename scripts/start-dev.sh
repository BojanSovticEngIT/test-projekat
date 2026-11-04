#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
JAVA_HOME="${JAVA_HOME:-/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home}"
export JAVA_HOME
BASE_URL="${E2E_BASE_URL:-http://localhost:5173}"
BACKEND_URL="${BACKEND_URL:-http://localhost:8080/wms/skillmatrix}"

wait_for_url() {
  local url="$1"
  local label="$2"
  for ((i = 1; i <= 60; i++)); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "   $label ready"
      return 0
    fi
    sleep 2
  done
  echo "ERROR: $label not ready" >&2
  return 1
}

echo "=============================================="
echo " Skill Matrix — Start dev stack (DB + BE + FE)"
echo "=============================================="
echo ""

start_postgres() {
  echo ">> Starting Postgres (Docker)..."
  if ! docker ps --format '{{.Names}}' | grep -q '^skill-matrix-db-e2e$'; then
    if docker ps -a --format '{{.Names}}' | grep -q '^skill-matrix-db-e2e$'; then
      docker start skill-matrix-db-e2e >/dev/null
    else
      docker run -d --name skill-matrix-db-e2e \
        -e POSTGRES_DB=skillmatrix \
        -e POSTGRES_USER=skillmatrix \
        -e POSTGRES_PASSWORD=password \
        -p 5433:5432 postgres:17 >/dev/null
    fi
    sleep 5
  fi
  echo "   Postgres ready on localhost:5433"
}

start_backend() {
  if curl -fsS "$BACKEND_URL/swagger-ui.html" >/dev/null 2>&1; then
    echo ">> Backend already running at $BACKEND_URL"
    return 0
  fi

  start_postgres

  echo ">> Starting backend (Spring Boot, dev profile)..."
  cd "$ROOT/backend"
  nohup env \
    SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5433/skillmatrix \
    SPRING_DATASOURCE_USERNAME=skillmatrix \
    SPRING_DATASOURCE_PASSWORD=password \
    mvn -q spring-boot:run -Dspring-boot.run.profiles=dev >>/tmp/skill-matrix-backend.log 2>&1 &
  echo "   backend log: /tmp/skill-matrix-backend.log"
  wait_for_url "$BACKEND_URL/swagger-ui.html" "Backend"
}

start_frontend() {
  if curl -fsS "$BASE_URL" >/dev/null 2>&1; then
    echo ">> Frontend already running at $BASE_URL"
    return 0
  fi

  echo ">> Starting frontend (Vite dev server)..."
  cd "$ROOT/frontend"
  nohup env VITE_API_BASE_URL=http://localhost:8080/wms/skillmatrix \
    npm run dev -- --host 127.0.0.1 --port 5173 >>/tmp/skill-matrix-frontend.log 2>&1 &
  echo "   frontend log: /tmp/skill-matrix-frontend.log"
  wait_for_url "$BASE_URL" "Frontend"
}

start_backend
start_frontend

echo ""
echo "=============================================="
echo " App is up"
echo "   Frontend:  $BASE_URL"
echo "   Backend:   $BACKEND_URL"
echo "   Swagger:   $BACKEND_URL/swagger-ui.html"
echo ""
echo " Login: pmo.user / manager / employee / hrbp.user"
echo " Password: password"
echo ""
echo " Logs:  tail -f /tmp/skill-matrix-backend.log"
echo "        tail -f /tmp/skill-matrix-frontend.log"
echo "=============================================="
