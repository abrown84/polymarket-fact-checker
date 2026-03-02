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

shutdown() {
  echo "Shutting down dev server + tunnel..."
  if [[ -n "${VITE_PID-}" ]]; then
    kill "$VITE_PID" 2>/dev/null || true
  fi
  if [[ -n "${TUNNEL_PID-}" ]]; then
    kill "$TUNNEL_PID" 2>/dev/null || true
  fi
}
trap shutdown EXIT INT TERM

cd "$CLIENT_DIR"
VITE_PORT=$PORT npm run dev -- --host 0.0.0.0 --port "$PORT" >"$ROOT_DIR/.mobile-vite.log" 2>&1 &
VITE_PID=$!

sleep 2

# Start localtunnel and show clear URL
npx localtunnel --port "$PORT" --local-host 127.0.0.1 --print-requests > "$ROOT_DIR/.mobile-tunnel.log" 2>&1 &
TUNNEL_PID=$!

# Wait up to ~10s for localtunnel to print the public URL.
for _ in {1..20}; do
  if grep -q "your url is:" "$ROOT_DIR/.mobile-tunnel.log" 2>/dev/null; then
    echo "Tunnel URL:"
    grep -m 1 "your url is:" "$ROOT_DIR/.mobile-tunnel.log"
    break
  fi
  sleep 0.5
done

if ! grep -q "your url is:" "$ROOT_DIR/.mobile-tunnel.log" 2>/dev/null; then
  echo "Tunnel URL not ready yet. Check: $ROOT_DIR/.mobile-tunnel.log"
fi

echo "Local LAN URL: http://${LOCAL_IP}:$PORT/"
echo "Local logs:"
echo "  - Vite: $ROOT_DIR/.mobile-vite.log"
echo "  - Tunnel: $ROOT_DIR/.mobile-tunnel.log"

echo "Press Ctrl+C to stop"
wait "$VITE_PID" "$TUNNEL_PID"