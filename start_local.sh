#!/usr/bin/env bash
#
# start_local.sh — build and run Mesonsoft locally.
#
# Usage:
#   ./start_local.sh              # clean, rebuild, and preview on port 3000
#   ./start_local.sh -p 3100      # custom port
#   ./start_local.sh --dev        # next dev (hot reload)
#   ./start_local.sh --fresh      # reinstall node_modules and rebuild
#
set -euo pipefail

PORT=3000
MODE="prod"
FRESH=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--port) PORT="${2:?Port number required}"; shift 2 ;;
    --dev) MODE="dev"; shift ;;
    --fresh) FRESH=true; shift ;;
    -h|--help) grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $1 (see ./start_local.sh --help)" >&2; exit 1 ;;
  esac
done

cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js is not installed. Install it from https://nodejs.org (v18+) and retry."
  exit 1
fi

if [[ "$FRESH" == true && -d node_modules ]]; then
  echo "🧹 --fresh: removing node_modules and .next ..."
  rm -rf node_modules .next out
fi

if [[ ! -d node_modules ]]; then
  echo "📦 Installing dependencies ..."
  npm install
fi

if [[ "$MODE" == "dev" ]]; then
  echo "🚀 Starting dev server (hot reload) on http://localhost:$PORT ..."
  exec npx next dev -p "$PORT"
fi

echo "🧹 Cleaning previous static build output ..."
rm -rf out .next

echo "🔨 Building static files ..."
npm run build

echo "🚀 Previewing static export at http://localhost:$PORT ..."
PORT="$PORT" exec node scripts/preview.mjs
