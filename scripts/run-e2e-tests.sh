#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
JAVA_HOME="${JAVA_HOME:-/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home}"
export JAVA_HOME
BASE_URL="${E2E_BASE_URL:-http://localhost:5173}"
HEADED="${E2E_HEADED:-0}"

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
echo " Skill Matrix — Browser E2E (Playwright)"
echo "=============================================="
echo ""

if ! curl -fsS "$BASE_URL" >/dev/null 2>&1; then
  echo ">> Starting Postgres (Docker)..."
  if ! docker ps --format '{{.Names}}' | grep -q '^skill-matrix-db-e2e$'; then
    docker run -d --name skill-matrix-db-e2e \
      -e POSTGRES_DB=skillmatrix \
      -e POSTGRES_USER=skillmatrix \
      -e POSTGRES_PASSWORD=password \
      -p 5433:5432 postgres:17 >/dev/null
    sleep 5
  fi

  echo ">> Starting backend..."
  cd "$ROOT/backend"
  SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5433/skillmatrix \
  SPRING_DATASOURCE_USERNAME=skillmatrix \
  SPRING_DATASOURCE_PASSWORD=password \
  mvn -q spring-boot:run -Dspring-boot.run.profiles=dev >/tmp/skill-matrix-backend.log 2>&1 &
  echo "   backend log: /tmp/skill-matrix-backend.log"

  echo ">> Starting frontend dev server..."
  cd "$ROOT/frontend"
  VITE_API_BASE_URL=http://localhost:8080/wms/skillmatrix \
  npm run dev -- --host 127.0.0.1 --port 5173 >/tmp/skill-matrix-frontend.log 2>&1 &
  echo "   frontend log: /tmp/skill-matrix-frontend.log"

  wait_for_url "$BASE_URL" "Frontend"
  wait_for_url "http://localhost:8080/wms/skillmatrix/swagger-ui.html" "Backend"
else
  echo ">> App already running at $BASE_URL"
fi

echo ""
echo ">> Installing Playwright dependencies..."
cd "$ROOT/e2e"
npm install --silent
npx playwright install chromium

echo ""
if [[ "$HEADED" == "1" ]]; then
  echo ">> Running epic browser flows (headed)..."
  E2E_BASE_URL="$BASE_URL" E2E_HEADED=1 npm run demo
else
  echo ">> Running epic browser flows (headless)..."
  E2E_BASE_URL="$BASE_URL" npm test
fi

echo ""
echo "=============================================="
echo " Browser E2E finished"
echo "=============================================="
