#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
JAVA_HOME="${JAVA_HOME:-/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home}"
export JAVA_HOME

echo "=============================================="
echo " Skill Matrix — Full Automation Test Suite"
echo "=============================================="
echo ""

echo ">> [1/3] Backend API automation (M1 + M2)"
cd "$ROOT/backend"
mvn -q test
echo "   Backend: PASS"
echo ""

echo ">> [2/3] Frontend UI automation"
cd "$ROOT/frontend"
npm test
echo "   Frontend: PASS"
echo ""

echo ">> [3/3] Frontend production build"
npm run build
echo "   Build: PASS"
echo ""

echo "=============================================="
echo " All automation checks passed"
echo "=============================================="
