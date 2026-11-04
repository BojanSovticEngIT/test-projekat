#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
JAVA_HOME="${JAVA_HOME:-/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home}"
export JAVA_HOME
BASE_URL="${E2E_BASE_URL:-http://localhost:5173}"
SLOW_MO="${E2E_SLOW_MO:-4000}"
STEP_PAUSE="${E2E_STEP_PAUSE:-3000}"
MODE="${1:-watch}"

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

usage() {
  cat <<'EOF'
Usage: ./scripts/run-browser-watch.sh [mode] [playwright args...]

Modes:
  watch       Headed Chromium, slowed (default: 4s/action + 3s between steps)
  slow        Slower (6s/action + 5s between steps)
  crawl       Very slow (8s/action + 6s between steps)
  glacial     Extremely slow (12s/action + 8s between steps) — best for human review
  ui          Playwright UI — step through tests interactively
  epic        One spec file: ./scripts/run-browser-watch.sh epic epic-03-allocations.spec.ts
  debug       Playwright inspector — pause and step manually

Custom speed:
  E2E_SLOW_MO=3000 E2E_STEP_PAUSE=2000 ./scripts/run-browser-watch.sh

Credentials: pmo.user / manager / employee / hrbp.user — password
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

echo "=============================================="
echo " Skill Matrix — Browser Watch (human validation)"
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

  echo ">> Starting frontend dev server..."
  cd "$ROOT/frontend"
  VITE_API_BASE_URL=http://localhost:8080/wms/skillmatrix \
  npm run dev -- --host 127.0.0.1 --port 5173 >/tmp/skill-matrix-frontend.log 2>&1 &

  wait_for_url "$BASE_URL" "Frontend"
  wait_for_url "http://localhost:8080/wms/skillmatrix/swagger-ui.html" "Backend"
else
  echo ">> App already running at $BASE_URL"
fi

echo ""
echo ">> Installing Playwright (if needed)..."
cd "$ROOT/e2e"
npm install --silent
npx playwright install chromium

export E2E_BASE_URL="$BASE_URL"
export E2E_HEADED=1

echo ""
case "$MODE" in
  watch)
    export E2E_SLOW_MO="$SLOW_MO"
    export E2E_STEP_PAUSE="$STEP_PAUSE"
    echo ">> Chromium — all epics (slowMo=${E2E_SLOW_MO}ms, stepPause=${E2E_STEP_PAUSE}ms)"
    echo "   One epic: $0 epic epic-02-projects.spec.ts"
    echo "   Slower:   $0 slow | crawl | glacial"
    npm run watch
    ;;
  slow)
    export E2E_SLOW_MO=6000
    export E2E_STEP_PAUSE=5000
    echo ">> Chromium — all epics (slowMo=6000ms, stepPause=5000ms)"
    npm run watch:slow
    ;;
  crawl)
    export E2E_SLOW_MO=8000
    export E2E_STEP_PAUSE=6000
    echo ">> Chromium — all epics (slowMo=8000ms, stepPause=6000ms)"
    npm run watch:crawl
    ;;
  glacial)
    export E2E_SLOW_MO=12000
    export E2E_STEP_PAUSE=8000
    echo ">> Chromium — all epics (slowMo=12000ms, stepPause=8000ms)"
    npm run watch:glacial
    ;;
  ui)
    echo ">> Playwright UI — pick a test and watch step-by-step"
    npm run watch:ui
    ;;
  epic)
    target="${2:-}"
    if [[ -z "$target" ]]; then
      echo "ERROR: pass a spec file, e.g. epic-03-allocations.spec.ts" >&2
      exit 1
    fi
    export E2E_SLOW_MO="$SLOW_MO"
    export E2E_STEP_PAUSE="$STEP_PAUSE"
    echo ">> Chromium — $target (slowMo=${E2E_SLOW_MO}ms, stepPause=${E2E_STEP_PAUSE}ms)"
    npx playwright test "$target" --headed --workers=1
    ;;
  debug)
    target="${2:-epic-01-foundation.spec.ts}"
    echo ">> Playwright debug — $target (use inspector to step/pause)"
    npx playwright test "$target" --headed --workers=1 --debug
    ;;
  *)
    echo "ERROR: unknown mode '$MODE'" >&2
    usage
    exit 1
    ;;
esac

echo ""
echo "=============================================="
echo " Videos: e2e/test-results/<test>/video.webm"
echo " Report: cd e2e && npm run report"
echo "=============================================="
