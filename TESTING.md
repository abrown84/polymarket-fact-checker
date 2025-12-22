# Testing Guide

## Quick Test Commands

### 1. Unit Tests (Convex Utils)
```bash
cd convex
npm test
```
Tests utility functions like cosine similarity, clamping, and hashing.

### 2. MCP Server Integration Tests
```bash
cd mcp-server
npm test
```
Tests Polymarket API integration (Gamma API, CLOB client).

### 3. Convex Connection Tests
```bash
npx convex run actions/testConnections:testConnections
```
Tests all external API connections:
- Polymarket Gamma API
- Polymarket CLOB API
- OpenRouter Embeddings
- OpenRouter Chat
- Convex Database

### 4. Run App Locally
```bash
# Terminal 1: Convex dev server
npm run dev:convex

# Terminal 2: Client dev server
npm run dev:client
```

Then open `http://localhost:5173` in your browser.

## Test Coverage

### ✅ Unit Tests
- Cosine similarity calculation
- Value clamping
- String hashing

### ✅ Integration Tests
- Polymarket API connectivity
- CLOB client functionality
- Market data fetching
- Price and order book retrieval

### ✅ Connection Tests
- All external API endpoints
- Database connectivity
- Authentication and authorization

## Manual Testing

### Search Functionality
1. Go to the Search tab
2. Enter a question like "Will the Fed cut rates in 2024?"
3. Verify:
   - Results appear within a few seconds
   - Markets are displayed with prices
   - Confidence scores are shown
   - Market details are accessible

### Dashboard
1. Go to the Dashboard tab
2. Verify:
   - Popular markets are displayed
   - Prices are shown (from WebSocket or REST API)
   - Stats are accurate
   - Markets update every 30 seconds

### Market Ingestion
1. Go to Dashboard → Market Ingestion
2. Click "Start Ingestion"
3. Verify:
   - WebSocket connection status shows "Connected"
   - Markets are being ingested
   - No error messages appear

### Error Handling
1. Disconnect from internet (or block WebSocket)
2. Verify:
   - App still loads
   - REST API fallback works
   - Error messages are user-friendly
   - Markets still display (without prices if needed)

## Expected Results

All automated tests should pass:
- ✅ 7/7 unit tests
- ✅ 4/4 MCP server tests
- ✅ 5/5 connection tests

The app should:
- Load without errors
- Display markets even if WebSocket fails
- Fall back to REST API when needed
- Show user-friendly error messages
- Update prices in real-time when WebSocket is connected


