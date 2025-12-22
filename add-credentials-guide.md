# Quick Guide: Adding Credentials to Convex

## Step-by-Step Instructions

### 1. Get Your OpenAI API Key (REQUIRED - 5 minutes)

1. **Go to:** https://platform.openai.com/api-keys
2. **Sign up/Login** if needed
3. **Click:** "Create new secret key"
4. **Name it:** "Polymarket Fact Checker"
5. **Copy the key** (starts with `sk-`)
   - ⚠️ **Save it now** - you won't see it again!

### 2. Add to Convex Dashboard

1. **Go to:** https://dashboard.convex.dev
2. **Select your project** (or create one if needed)
3. **Click:** Settings (left sidebar)
4. **Click:** Environment Variables
5. **Click:** "Add Variable"
6. **Enter:**
   - **Name:** `OPENAI_API_KEY`
   - **Value:** (paste your key from step 1)
7. **Click:** "Save"

### 3. Test It Works

Run this command:
```bash
npx convex run actions/testConnections:testConnections
```

You should see:
- ✅ OpenAI Embeddings API: SUCCESS
- ✅ OpenAI Chat API: SUCCESS

---

## Optional: Add Other Credentials

The app works with just OpenAI! But if you want more data sources:

### Twitter (Optional)
1. Get from: https://developer.twitter.com/en/portal/dashboard
2. Add: `TWITTER_BEARER_TOKEN`

### TikTok (Optional)
1. Get from: https://developers.tiktok.com/
2. Add: `TIKTOK_API_KEY` and `TIKTOK_API_SECRET`

### Instagram (Optional)
1. Get from: https://developers.facebook.com/
2. Add: `INSTAGRAM_ACCESS_TOKEN` and `INSTAGRAM_APP_ID`

### Kalshi (Optional)
1. Get from: https://kalshi.com/ (requires account)
2. Add: `KALSHI_API_KEY` and `KALSHI_API_SECRET`

### NewsAPI (Optional)
1. Get from: https://newsapi.org/
2. Add: `NEWS_API_KEY`

**All of these are optional** - the app gracefully skips them if not configured!

---

## Quick Links

- **OpenAI API Keys:** https://platform.openai.com/api-keys
- **Convex Dashboard:** https://dashboard.convex.dev
- **Twitter Developer:** https://developer.twitter.com/en/portal/dashboard
- **TikTok Developers:** https://developers.tiktok.com/
- **Facebook Developers:** https://developers.facebook.com/
- **NewsAPI:** https://newsapi.org/

---

## Troubleshooting

**"OPENAI_API_KEY environment variable is required"**
- Make sure you added it in Convex dashboard
- Check the spelling: `OPENAI_API_KEY` (not `OPENROUTER_API_KEY`)
- Wait a minute for Convex to sync

**"401 Unauthorized"**
- Check your API key is correct
- Make sure you copied the full key
- For OpenAI: Check you have credits/billing set up

**Can't find my Convex project?**
- Check `convex.json` file for project name
- Or go to https://dashboard.convex.dev and look for your project



