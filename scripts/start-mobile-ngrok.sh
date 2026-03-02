#!/usr/bin/env bash
set -euo pipefail

PORT="${POLYMARKET_MOBILE_PORT:-4173}"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CLIENT_DIR="$ROOT_DIR/client"

get_local_ip() {
  ip -4 route get 1.1.1.1 2>/dev/null | awk '{print $7; exit}'
}

LOCAL_IP="$(get_local_ip)"
if [ -z "$LOCAL_IP" ]; then
  LOCAL_IP="127.0.0.1"
fi

export VITE_CONVEX_URL="http://${LOCAL_IP}:3210"

echo "Starting Vite on port $PORT and public IP $LOCAL_IP"
echo "Convex URL: $VITE_CONVEX_URL"

VITE_LOG="$ROOT_DIR/.mobile-vite.log"
NGROK_LOG="$ROOT_DIR/.mobile-ngrok.log"

shutdown() {
  echo "Shutting down dev server + ngrok..."
  if [[ -n "${VITE_PID-}" ]]; then
    kill "$VITE_PID" 2>/dev/null || true
  fi
  if [[ -n "${NGROK_PID-}" ]]; then
    kill "$NGROK_PID" 2>/dev/null || true
  fi
}
trap shutdown EXIT INT TERM

cd "$CLIENT_DIR"
VITE_PORT=$PORT npm run dev -- --host 0.0.0.0 --port "$PORT" >"$VITE_LOG" 2>&1 &
VITE_PID=$!

sleep 2

echo "Starting ngrok tunnel..."
ngrok http "$PORT" --log=stdout >"$NGROK_LOG" 2>&1 &
NGROK_PID=$!

echo "Local LAN URL: http://${LOCAL_IP}:$PORT/"
echo "Local logs:"
echo "  - Vite: $VITE_LOG"
echo "  - Tunnel: $NGROK_LOG"
echo "Waiting for public ngrok URL..."

for _ in {1..60}; do
  if grep -q "msg=started tunnel" "$NGROK_LOG"; then
    break
  fi
  sleep 0.5
 done

echo "Recent tunnel log output:"
tail -n 30 "$NGROK_LOG" || true

echo "Press Ctrl+C to stop"
wait "$VITE_PID" "$NGROK_PID"