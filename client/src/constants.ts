/**
 * Application-wide constants
 * Centralized configuration values that can be easily adjusted
 */

// UI/Animation Constants
export const UI_CONSTANTS = {
  // Tab indicator update delay (ms) - small delay to ensure DOM is updated
  TAB_INDICATOR_UPDATE_DELAY: 10,
  
  // Animation timing
  ANIMATION: {
    SPRING_STIFFNESS: 400,
    SPRING_DAMPING: 30,
    TRANSITION_DURATION: 0.25,
  },
} as const;

// Data Fetching Constants
export const DATA_CONSTANTS = {
  // Dashboard polling interval (ms)
  DASHBOARD_POLL_INTERVAL: 30 * 1000, // 30 seconds
  
  // Market limits
  MARKETS_PER_PAGE: 20,
  MARKETS_INITIAL_LOAD: 20,

  // Hot events (Gamma /events) limits
  HOT_EVENTS_LIMIT: 8,
  HOT_EVENTS_FETCH_LIMIT: 50,
  
  // News limits
  NEWS_ARTICLES_LIMIT: 1000,
  
  // Query limits
  RECENT_QUERIES_LIMIT: 20,
} as const;

// WebSocket Constants
export const WEBSOCKET_CONSTANTS = {
  MAX_RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAYS: [5000, 10000, 20000, 30000, 60000], // ms
} as const;

