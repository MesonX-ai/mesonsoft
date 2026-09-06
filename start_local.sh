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

# Stop anything currently listening on the target port (e.g. a previous
# preview instance) so the server doesn't die with EADDRINUSE.
free_port() {
  local port="$1" pids
  pids="$(lsof -tnP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "🛑 Port $port is in use (PID(s): $(echo "$pids" | tr '\n' ' ')) — stopping ..."
    kill $pids 2>/dev/null || true
    sleep 1
    pids="$(lsof -tnP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "$pids" ]]; then
      echo "⚠️  Still running — sending SIGKILL ..."
      kill -9 $pids 2>/dev/null || true
      sleep 1
    fi
    echo "✅ Port $port is now free."
  else
    echo "👍 Port $port is already free."
  fi
}

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
  free_port "$PORT"
  echo "🚀 Starting dev server (hot reload) on http://localhost:$PORT ..."
  exec npx next dev -p "$PORT"
fi

echo "🧹 Cleaning previous static build output ..."
rm -rf out .next

echo "🔨 Building static files ..."
npm run build

free_port "$PORT"
echo "🚀 Previewing static export at http://localhost:$PORT ..."
PORT="$PORT" exec node scripts/preview.mjs
