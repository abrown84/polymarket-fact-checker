# 🚀 Quick Reference: Optional Credentials

## Fastest Setup Order (Recommended)

### 1. NewsAPI (2 minutes) ⚡ FASTEST
- **Link:** https://newsapi.org/
- **Steps:** Sign up → Get API key from dashboard
- **Add to Convex:** `NEWS_API_KEY`
- **Free Tier:** 100 requests/day

### 2. Twitter/X (10 minutes)
- **Link:** https://developer.twitter.com/en/portal/dashboard
- **Steps:** Sign up → Create Project → Create App → Generate Bearer Token
- **Add to Convex:** `TWITTER_BEARER_TOKEN`
- **Free Tier:** Available

### 3. Kalshi (10 minutes)
- **Link:** https://kalshi.com/
- **Steps:** Sign up → Find API settings → Generate credentials
- **Add to Convex:** `KALSHI_API_KEY`, `KALSHI_API_SECRET`
- **Note:** May require account verification

### 4. TikTok (15 minutes - may need approval)
- **Link:** https://developers.tiktok.com/
- **Steps:** Sign up → Create App → Get Client Key & Secret
- **Add to Convex:** `TIKTOK_API_KEY`, `TIKTOK_API_SECRET`
- **Note:** Research API may require special access

### 5. Instagram (20 minutes - requires business account)
- **Link:** https://developers.facebook.com/
- **Steps:** Create Facebook App → Add Instagram → Get App ID & Token
- **Add to Convex:** `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_APP_ID`
- **Requires:** Instagram Business/Creator account + Facebook Page

---

## 📝 Convex Dashboard Steps (For Each Credential)

1. Go to: https://dashboard.convex.dev
2. Select your project
3. Click: **Settings** (left sidebar)
4. Click: **Environment Variables**
5. Click: **"Add Variable"**
6. Enter:
   - **Name:** (variable name from below)
   - **Value:** (paste your credential)
7. Click: **"Save"**

---

## 📋 Variable Names Reference

Copy-paste these exact names when adding to Convex:

```
TWITTER_BEARER_TOKEN
TIKTOK_API_KEY
TIKTOK_API_SECRET
INSTAGRAM_ACCESS_TOKEN
INSTAGRAM_APP_ID
KALSHI_API_KEY
KALSHI_API_SECRET
NEWS_API_KEY
```

---

## ✅ Checklist

As you complete each, check it off:

- [ ] NewsAPI - Added `NEWS_API_KEY`
- [ ] Twitter - Added `TWITTER_BEARER_TOKEN`
- [ ] Kalshi - Added `KALSHI_API_KEY` and `KALSHI_API_SECRET`
- [ ] TikTok - Added `TIKTOK_API_KEY` and `TIKTOK_API_SECRET`
- [ ] Instagram - Added `INSTAGRAM_ACCESS_TOKEN` and `INSTAGRAM_APP_ID`

---

## 🧪 Test After Adding

After adding each credential (or all of them), test:

```bash
npx convex run actions/testConnections:testConnections
```

Then try a fact-check query to see the new data sources!

---

## 💡 Tips

1. **Start with NewsAPI** - Easiest and fastest
2. **Do one at a time** - Test each as you add it
3. **Save credentials** - Keep them in a password manager
4. **Some need approval** - TikTok/Instagram may take time
5. **App works without them** - Don't stress if some don't work immediately

---

## 🔗 All Links in One Place

- [NewsAPI](https://newsapi.org/) - Start here! (2 min)
- [Twitter Developer](https://developer.twitter.com/en/portal/dashboard) - ~10 min
- [Kalshi](https://kalshi.com/) - ~10 min
- [TikTok Developers](https://developers.tiktok.com/) - ~15 min (may need approval)
- [Facebook Developers](https://developers.facebook.com/) - ~20 min (needs business account)
- [Convex Dashboard](https://dashboard.convex.dev) - Add credentials here

---

## 📚 Detailed Instructions

For step-by-step instructions, see:
- `SETUP_OPTIONAL_CREDENTIALS.md` - Full detailed guide



