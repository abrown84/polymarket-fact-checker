import { useEffect, useRef, useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

// Note: This WebSocket URL may require authentication or may not be publicly accessible
// If connection fails, the app will continue to work but without real-time updates
const WS_URL = "wss://ws-live-data.polymarket.com";
const PING_INTERVAL = 5000; // 5 seconds

// Maximum reconnection attempts before giving up
const MAX_RECONNECT_ATTEMPTS = 5;

interface WebSocketMessage {
  topic?: string;
  type?: string;
  timestamp?: number;
  payload?: any;
  error?: any;
}

interface UsePolymarketWebSocketOptions {
  marketIds?: string[];
  tokenIds?: string[];
  enabled?: boolean;
  onMessage?: (message: WebSocketMessage) => void;
  ingestMarkets?: boolean; // Subscribe to market metadata feeds
}

export function usePolymarketWebSocket(options: UsePolymarketWebSocketOptions = {}) {
  const { marketIds = [], tokenIds = [], enabled = true, onMessage, ingestMarkets = false } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const upsertPrice = useMutation(api.mutations.upsertRealtimePrice);
  const upsertMarket = useMutation(api.mutations.upsertMarketFromWebSocket);

  const connect = useCallback(() => {
    if (!enabled || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[WebSocket] Connected to Polymarket");
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection

        // Subscribe to markets if provided
        // Note: Polymarket WebSocket API format may vary - adjust based on actual API docs
        if (marketIds.length > 0 || tokenIds.length > 0) {
          marketIds.forEach((marketId) => {
            // Subscribe to price updates for market
            try {
              ws.send(
                JSON.stringify({
                  type: "subscribe",
                  channel: "prices",
                  market: marketId,
                })
              );
            } catch (err) {
              console.warn("[WebSocket] Failed to subscribe to market:", marketId, err);
            }
          });

          tokenIds.forEach((tokenId) => {
            try {
              ws.send(
                JSON.stringify({
                  type: "subscribe",
                  channel: "prices",
                  token_id: tokenId,
                })
              );
            } catch (err) {
              console.warn("[WebSocket] Failed to subscribe to token:", tokenId, err);
            }
          });
        }

        // Subscribe to market metadata feeds for ingestion
        // Wait a bit before subscribing to ensure connection is stable
        if (ingestMarkets) {
          setTimeout(() => {
            try {
              if (ws.readyState === WebSocket.OPEN) {
                // Try different subscription formats based on Polymarket's actual API
                const subscribeMessages = [
                  { type: "subscribe", channel: "markets" },
                  { type: "subscribe", topic: "markets" },
                  { action: "subscribe", channel: "markets" },
                ];
                
                // Try the first format
                ws.send(JSON.stringify(subscribeMessages[0]));
                console.log("[WebSocket] Subscribed to market metadata feed for ingestion");
              }
            } catch (err) {
              console.warn("[WebSocket] Failed to subscribe to market feed:", err);
            }
          }, 500); // Wait 500ms after connection before subscribing
        }

        // Start ping interval to keep connection alive
        // Wait a bit before starting pings to ensure connection is stable
        setTimeout(() => {
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(JSON.stringify({ type: "ping" }));
              } catch (err) {
                console.warn("[WebSocket] Failed to send ping:", err);
              }
            }
          }, PING_INTERVAL);
        }, 1000); // Wait 1 second after connection before starting pings
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          // Log all messages for debugging (can be removed in production)
          console.log("[WebSocket] Received message:", message);

          // Handle pong responses
          if (message.type === "pong" || message.type === "ping") {
            return;
          }
          
          // Handle subscription confirmations
          if (message.type === "subscribed" || message.type === "subscription_success") {
            console.log("[WebSocket] Subscription confirmed:", message);
            return;
          }
          
          // Handle errors from server
          if (message.type === "error" || message.error) {
            console.error("[WebSocket] Server error:", message.error || message);
            setError(`Server error: ${JSON.stringify(message.error || message)}`);
            return;
          }

          // Handle price updates - Polymarket WebSocket format may vary
          // Check for various possible message formats
          const isPriceUpdate =
            message.topic === "prices" ||
            message.type === "price_update" ||
            message.type === "price" ||
            (message.payload && (message.payload.price !== undefined || message.payload.bid !== undefined));

          if (isPriceUpdate) {
            const payload = message.payload || message;
            const marketId = payload.market || payload.marketId || payload.market_id;
            const tokenId = payload.token_id || payload.tokenId;
            const price = payload.price;
            const bid = payload.bid;
            const ask = payload.ask;
            const spread = ask && bid ? ask - bid : payload.spread || null;
            const volume = payload.volume;

            if (marketId || tokenId) {
              // Update price in Convex
              upsertPrice({
                marketId: marketId || "",
                tokenId: tokenId || null,
                price: typeof price === "number" ? price : null,
                bid: typeof bid === "number" ? bid : null,
                ask: typeof ask === "number" ? ask : null,
                spread: typeof spread === "number" ? spread : null,
                volume: typeof volume === "number" ? volume : null,
              }).catch((err) => {
                console.error("[WebSocket] Error updating price:", err);
              });
            }
          }

          // Handle market metadata updates for ingestion
          const isMarketUpdate =
            message.topic === "markets" ||
            message.type === "market_update" ||
            message.type === "market" ||
            (message.payload && (message.payload.title !== undefined || message.payload.question !== undefined));

          if (isMarketUpdate && ingestMarkets) {
            const payload = message.payload || message;
            const marketId = payload.id || payload.marketId || payload.market_id;
            const title = payload.title || payload.question || payload.name;
            const description = payload.description || payload.resolution || "";
            const slug = payload.slug;
            const url = payload.url || (slug ? `https://polymarket.com/event/${slug}` : null);
            const endDate = payload.endDate || payload.endDateISO || payload.endDateIso;
            const endDateTimestamp = endDate ? new Date(endDate).getTime() : null;
            const outcomes = payload.outcomes || payload.tokens || ["Yes", "No"];
            const volume = payload.volume || payload.volumeUSD || payload.usdVolume || null;
            const liquidity = payload.liquidity || payload.totalLiquidity || payload.usdLiquidity || null;
            const active = payload.active !== false;

            if (marketId && title) {
              // Store market in Convex
              upsertMarket({
                polymarketMarketId: marketId,
                title,
                description,
                slug: slug || null,
                url: url || null,
                endDate: endDateTimestamp,
                outcomes: Array.isArray(outcomes) ? outcomes : ["Yes", "No"],
                volume,
                liquidity,
                active,
              }).catch((err) => {
                console.error("[WebSocket] Error storing market:", err);
              });
            }
          }

          // Call custom message handler
          if (onMessage) {
            onMessage(message);
          }
        } catch (err) {
          console.error("[WebSocket] Error parsing message:", err);
        }
      };

      ws.onerror = () => {
        // Only log errors for first few attempts to reduce console noise
        if (reconnectAttemptsRef.current < 2) {
          console.warn("[WebSocket] Connection error (will retry silently)");
        }
        setIsConnected(false);
        // Don't set error here - let onclose handle it to avoid duplicate messages
      };

      ws.onclose = (event) => {
        console.log("[WebSocket] Connection closed", {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
        setIsConnected(false);

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Set error message if connection closed unexpectedly
        // Code 1006 = abnormal closure (no close frame received)
        // Code 1000 = normal closure
        if (!event.wasClean && event.code !== 1000) {
          // Only log first few errors to reduce console noise
          if (reconnectAttemptsRef.current < 2) {
            let errorMsg = event.reason || `Connection closed (code: ${event.code})`;
            
            // Provide more helpful error messages for common codes
            if (event.code === 1006) {
              errorMsg = "WebSocket connection unavailable. Using REST API fallback.";
            } else if (event.code === 1002) {
              errorMsg = "Protocol error. Check WebSocket message format.";
            } else if (event.code === 1003) {
              errorMsg = "Unsupported data type.";
            } else if (event.code === 1008) {
              errorMsg = "Policy violation. Check authentication/authorization.";
            }
            
            // Only set error for first attempt, then silently fail
            if (reconnectAttemptsRef.current === 0) {
              setError(errorMsg);
            }
            console.warn("[WebSocket] Connection issue:", errorMsg);
          }
        } else if (event.wasClean) {
          // Normal closure - clear error
          setError(null);
        }

        // Attempt to reconnect after delay (longer delay for 1006 errors)
        // But limit reconnection attempts to avoid infinite loops
        if (enabled && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current += 1;
          // Exponential backoff: 5s, 10s, 20s, 30s, 60s
          const delays = [5000, 10000, 20000, 30000, 60000];
          const reconnectDelay = delays[Math.min(reconnectAttemptsRef.current - 1, delays.length - 1)];
          
          // Only log reconnection attempts for first few tries
          if (reconnectAttemptsRef.current <= 2) {
            console.log(`[WebSocket] Retrying connection in ${reconnectDelay / 1000}s (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})...`);
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay);
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          // Silently disable WebSocket after max attempts - app works fine without it
          console.info("[WebSocket] Disabled after max attempts. App will use REST API for price data.");
          setError(null); // Clear error to not alarm users
        }
      };
    } catch (err) {
      console.error("[WebSocket] Failed to connect:", err);
      const errorMsg = err instanceof Error ? err.message : "Failed to connect";
      console.error("[WebSocket] Connection attempt failed:", {
        url: WS_URL,
        error: errorMsg,
        enabled,
      });
      setError(`Failed to connect: ${errorMsg}. Check browser console for details.`);
      setIsConnected(false);
    }
  }, [enabled, marketIds, tokenIds, ingestMarkets, upsertPrice, upsertMarket, onMessage]);

  const disconnect = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    reconnectAttemptsRef.current = 0; // Reset reconnect attempts on manual disconnect
  }, []);

  const subscribe = useCallback(
    (marketId?: string, tokenId?: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.warn("[WebSocket] Cannot subscribe: not connected");
        return;
      }

      if (marketId) {
        wsRef.current.send(
          JSON.stringify({
            type: "subscribe",
            channel: "prices",
            market: marketId,
          })
        );
      }

      if (tokenId) {
        wsRef.current.send(
          JSON.stringify({
            type: "subscribe",
            channel: "prices",
            token_id: tokenId,
          })
        );
      }
    },
    []
  );

  const unsubscribe = useCallback(
    (marketId?: string, tokenId?: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        return;
      }

      if (marketId) {
        wsRef.current.send(
          JSON.stringify({
            type: "unsubscribe",
            channel: "prices",
            market: marketId,
          })
        );
      }

      if (tokenId) {
        wsRef.current.send(
          JSON.stringify({
            type: "unsubscribe",
            channel: "prices",
            token_id: tokenId,
          })
        );
      }
    },
    []
  );

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    isConnected,
    error,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
  };
}

