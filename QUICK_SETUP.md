# Quick Setup Guide - Get All Credentials

## Fastest Path: Just Get Gemini (5 minutes)

**The app works with just a Gemini API key.** All other APIs are optional.

### Step 1: Get Gemini Key
1. Open: https://aistudio.google.com/apikey
2. Create an API key
3. Copy the key

### Step 2: Add to Convex
1. Open: https://dashboard.convex.dev
2. Select your project
3. Go to: **Settings** → **Environment Variables**
4. Click **"Add Variable"**
5. Enter:
   - Name: `GEMINI_API_KEY`
   - Value: (paste your key)
6. Optionally set:
   - `GEMINI_CHAT_MODEL` = `gemini-3.8-flash` (default)
   - `GEMINI_EMBED_MODEL` = `gemini-embedding-2` (default)
7. Click **"Save"**

### Step 3: Test
```bash
npx convex run actions/testConnections:testConnections
```

**Done!** Your app now works with:
- Polymarket markets
- Reddit posts
- News articles
- AI fact-checking (Gemini)

### Re-index embeddings (if you previously used OpenAI)

Gemini embeddings are a different dimension/space than `text-embedding-3-small`. Re-run:

```bash
npx convex run actions/ingestMarkets:ingestMarkets '{"cursor":null}'
```

---

## Full Credential Checklist

### Required
- [ ] `GEMINI_API_KEY` - https://aistudio.google.com/apikey

### Optional
- [ ] `TWITTER_BEARER_TOKEN` - https://developer.twitter.com/en/portal/dashboard
- [ ] `TIKTOK_API_KEY` + `TIKTOK_API_SECRET` - https://developers.tiktok.com/
- [ ] `INSTAGRAM_ACCESS_TOKEN` + `INSTAGRAM_APP_ID` - https://developers.facebook.com/
- [ ] `KALSHI_API_KEY` + `KALSHI_API_SECRET` - https://kalshi.com/
- [ ] `NEWS_API_KEY` - https://newsapi.org/

---

## Quick Links

### Required
- [Google AI Studio API Keys](https://aistudio.google.com/apikey)
- [Convex Dashboard](https://dashboard.convex.dev)

### Optional
- [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
- [TikTok Developers](https://developers.tiktok.com/)
- [Facebook Developers](https://developers.facebook.com/)
- [NewsAPI](https://newsapi.org/)
- [Kalshi](https://kalshi.com/)

---

## Pro Tips

1. **Start with Gemini only** — get it working first
2. **Add other sources one at a time** — test each as you add it
3. **Use Convex dashboard** — easiest way to manage secrets
4. **Check logs** — see which APIs are working

---

## Need Help?

- **Can't find Convex project?** Run `npx convex dev` to see your project
- **API key not working?** Confirm the full key and Gemini API access in AI Studio
- **Still stuck?** See `.env.example` and `README.md`
