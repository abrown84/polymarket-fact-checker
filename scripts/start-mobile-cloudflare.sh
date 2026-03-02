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

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared CLI not found."
  echo "Install Cloudflare Tunnel CLI first:"
  echo "  - macOS: brew install cloudflare/cloudflare/cloudflared"
  echo "  - Linux: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
  exit 1
fi

export VITE_CONVEX_URL="http://${LOCAL_IP}:3210"

echo "Starting Vite on port $PORT and public IP $LOCAL_IP"
echo "Convex URL: $VITE_CONVEX_URL"

tmp_vite_log="$ROOT_DIR/.mobile-vite.log"
tmp_tunnel_log="$ROOT_DIR/.mobile-cloudflare.log"

shutdown() {
  echo "Shutting down dev server + Cloudflare Tunnel..."
  if [[ -n "${VITE_PID-}" ]]; then
    kill "$VITE_PID" 2>/dev/null || true
  fi
  if [[ -n "${TUNNEL_PID-}" ]]; then
    kill "$TUNNEL_PID" 2>/dev/null || true
  fi
}
trap shutdown EXIT INT TERM

cd "$CLIENT_DIR"
VITE_PORT=$PORT npm run dev -- --host 0.0.0.0 --port "$PORT" >"$tmp_vite_log" 2>&1 &
VITE_PID=$!

sleep 2

echo "Starting Cloudflare tunnel..."
cloudflared tunnel --url "http://127.0.0.1:$PORT" >"$tmp_tunnel_log" 2>&1 &
TUNNEL_PID=$!

echo "Local LAN URL: http://${LOCAL_IP}:$PORT/"
echo "Local logs:"
echo "  - Vite: $tmp_vite_log"
echo "  - Tunnel: $tmp_tunnel_log"

echo "Waiting for tunnel URL..."
for _ in {1..40}; do
  if grep -m1 -E "https://.*\.trycloudflare\.com|https://.*\.cfargotunnel\.com" "$tmp_tunnel_log" >/dev/null 2>&1; then
    echo "Tunnel URL:" 
    grep -m1 -E "https://.*\.(trycloudflare\.com|cfargotunnel\.com)" "$tmp_tunnel_log"
    break
  fi
  sleep 0.5

done

echo "Press Ctrl+C to stop"
wait "$VITE_PID" "$TUNNEL_PID"