# Polymarket WebSocket Authentication

## Current Status

**You do NOT need credentials for:**
- ✅ **REST APIs** (Gamma API, CLOB API) - Public data access works without authentication
- ✅ **Reading market data** - All public market information is accessible

**You MAY need credentials for:**
- ⚠️ **WebSocket connections** - The endpoint `wss://ws-live-data.polymarket.com` may require authentication for user-specific channels

## WebSocket Authentication (If Needed)

If you want to use the WebSocket for real-time updates, you may need to:

1. **Get API Credentials from Polymarket:**
   - Go to your Polymarket account settings
   - Generate API key, secret, and passphrase
   - These are used to sign WebSocket connection requests

2. **Add to Environment Variables:**
   ```env
   POLYMARKET_API_KEY=your_api_key
   POLYMARKET_API_SECRET=your_api_secret
   POLYMARKET_API_PASSPHRASE=your_passphrase
   ```

3. **Update WebSocket Connection:**
   The WebSocket hook would need to be updated to include authentication headers or signed messages.

## Current Behavior

**The app works perfectly without WebSocket:**
- ✅ REST API fallback provides all market data
- ✅ Prices are fetched via REST API when WebSocket fails
- ✅ No functionality is lost - just slightly less real-time

**WebSocket is optional:**
- The app gracefully degrades to REST API
- You can disable WebSocket entirely if you don't have credentials
- All features work with REST API polling

## Recommendation

**For now, you don't need credentials** - the app works great with REST API fallback. The WebSocket is a "nice-to-have" for real-time updates, but not required.

If you want real-time WebSocket updates later, you can:
1. Get Polymarket API credentials
2. Update the WebSocket hook to include authentication
3. The app will automatically use WebSocket when available




