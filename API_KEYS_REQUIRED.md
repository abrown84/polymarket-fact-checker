# API Keys Required for Data Sources

## 🔴 **REQUIRED** (App won't work without these)

### 1. **OpenAI API Key** (`OPENAI_API_KEY`)
- **Required for:** AI parsing, embeddings, answer generation
- **Status:** ❌ **MUST HAVE** - App will throw error without this
- **Where to get:** https://platform.openai.com/api-keys
- **Usage:** Used for all AI operations (claim parsing, embeddings, reranking, answer generation)

### 2. **OpenAI Chat Model** (`OPENAI_CHAT_MODEL`)
- **Default:** `gpt-4o-mini`
- **Status:** Optional (has default)
- **Usage:** AI chat completions

### 3. **OpenAI Embed Model** (`OPENAI_EMBED_MODEL`)
- **Default:** `text-embedding-3-small`
- **Status:** Optional (has default)
- **Usage:** Text embeddings for similarity search

---

## 🟡 **OPTIONAL** (App works without, but gracefully skips)

### 4. **Twitter Bearer Token** (`TWITTER_BEARER_TOKEN`)
- **Required for:** Twitter/X data retrieval
- **Status:** ⚠️ **OPTIONAL** - Returns empty array if not set
- **Where to get:** https://developer.twitter.com/en/portal/dashboard
- **Note:** Requires Twitter Developer account
- **Behavior:** If missing, Twitter feed will be empty (no errors)

### 5. **TikTok API Key** (`TIKTOK_API_KEY` + `TIKTOK_API_SECRET`)
- **Required for:** TikTok video data retrieval
- **Status:** ⚠️ **OPTIONAL** - Returns empty array if not set
- **Where to get:** https://developers.tiktok.com/
- **Note:** Requires TikTok Research API access
- **Behavior:** If missing, TikTok feed will be empty (no errors)

### 6. **Instagram Access Token** (`INSTAGRAM_ACCESS_TOKEN` + `INSTAGRAM_APP_ID`)
- **Required for:** Instagram post data retrieval
- **Status:** ⚠️ **OPTIONAL** - Returns empty array if not set
- **Where to get:** https://developers.facebook.com/docs/instagram-api
- **Note:** Requires Instagram Business/Creator account + Facebook App
- **Behavior:** If missing, Instagram feed will be empty (no errors)

### 7. **Kalshi API Credentials** (`KALSHI_API_KEY` + `KALSHI_API_SECRET`)
- **Required for:** Kalshi prediction market data
- **Status:** ⚠️ **OPTIONAL** - Returns empty array if not set
- **Where to get:** https://kalshi.com/ (requires account)
- **Note:** Need to check Kalshi API documentation for exact setup
- **Behavior:** If missing, Kalshi markets will be empty (no errors)

### 8. **NewsAPI Key** (`NEWS_API_KEY`)
- **Required for:** Additional news articles from NewsAPI
- **Status:** ⚠️ **OPTIONAL** - RSS feeds work without it
- **Where to get:** https://newsapi.org/
- **Note:** Free tier available (limited requests)
- **Behavior:** If missing, only RSS feeds are used (still works)

---

## 🟢 **NO API KEY NEEDED** (Public APIs)

### 9. **Reddit**
- **Status:** ✅ **NO KEY NEEDED** - Public API
- **How it works:** Uses Reddit's public JSON API
- **Limitations:** May rate limit with too many requests
- **User-Agent:** Set to "PolymarketFactChecker/1.0"

### 10. **Polymarket**
- **Status:** ✅ **NO KEY NEEDED** - Public APIs
- **APIs Used:**
  - Gamma API: `https://gamma-api.polymarket.com` (public)
  - CLOB API: `https://clob.polymarket.com` (public)
- **Environment Variables:** Optional (has defaults)
  - `POLYMARKET_GAMMA_BASE` (defaults to gamma-api.polymarket.com)
  - `POLYMARKET_CLOB_BASE` (defaults to clob.polymarket.com)

### 11. **News RSS Feeds**
- **Status:** ✅ **NO KEY NEEDED** - Public RSS feeds
- **Sources:** Reuters, AP News, BBC, The Guardian, CNN, NPR, Politico, Axios
- **How it works:** Parses RSS feeds directly
- **Note:** Works even without NewsAPI key

---

## 📋 Summary

### Minimum Setup (App Works):
- ✅ `OPENAI_API_KEY` - **REQUIRED**

### With This Setup, You Get:
- ✅ Polymarket markets (public API)
- ✅ Reddit posts (public API)
- ✅ News from RSS feeds (public)
- ✅ AI-powered fact-checking

### Full Setup (All Features):
- ✅ `OPENAI_API_KEY` - **REQUIRED**
- ⚠️ `TWITTER_BEARER_TOKEN` - Optional
- ⚠️ `TIKTOK_API_KEY` + `TIKTOK_API_SECRET` - Optional
- ⚠️ `INSTAGRAM_ACCESS_TOKEN` + `INSTAGRAM_APP_ID` - Optional
- ⚠️ `KALSHI_API_KEY` + `KALSHI_API_SECRET` - Optional
- ⚠️ `NEWS_API_KEY` - Optional (enhances news)

---

## 🔧 How to Set API Keys

### In Convex Dashboard:
1. Go to your Convex project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each key as a new environment variable
4. Keys are automatically available in `process.env`

### Example:
```
OPENAI_API_KEY=sk-...
TWITTER_BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAAA...
TIKTOK_API_KEY=your_key_here
TIKTOK_API_SECRET=your_secret_here
```

---

## ⚠️ Important Notes

1. **Graceful Degradation:** All optional APIs gracefully skip if keys are missing
2. **No Errors:** Missing optional keys won't break the app
3. **Logging:** Console logs will indicate when APIs are skipped
4. **Caching:** All API responses are cached for 30 minutes to reduce API calls

---

## 🧪 Testing Without Keys

You can test the app with just `OPENAI_API_KEY`:
- ✅ Polymarket markets will work
- ✅ Reddit posts will work
- ✅ News from RSS will work
- ⚠️ Twitter/TikTok/Instagram/Kalshi will show 0 items (no errors)

The app is designed to work with minimal configuration!

