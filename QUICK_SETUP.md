# 🚀 Quick Setup Guide - Get All Credentials

## ⚡ Fastest Path: Just Get OpenAI (5 minutes)

**The app works with just OpenAI!** All other APIs are optional.

### Step 1: Get OpenAI Key
1. Open: https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with `sk-`)

### Step 2: Add to Convex
1. Open: https://dashboard.convex.dev
2. Select your project
3. Go to: **Settings** → **Environment Variables**
4. Click **"Add Variable"**
5. Enter:
   - Name: `OPENAI_API_KEY`
   - Value: (paste your key)
6. Click **"Save"**

### Step 3: Test
```bash
npx convex run actions/testConnections:testConnections
```

**Done!** Your app now works with:
- ✅ Polymarket markets
- ✅ Reddit posts  
- ✅ News articles
- ✅ AI fact-checking

---

## 📋 Full Credential Checklist

### 🔴 Required (Must Have)
- [ ] `OPENAI_API_KEY` - https://platform.openai.com/api-keys

### 🟡 Optional (Nice to Have)
- [ ] `TWITTER_BEARER_TOKEN` - https://developer.twitter.com/en/portal/dashboard
- [ ] `TIKTOK_API_KEY` + `TIKTOK_API_SECRET` - https://developers.tiktok.com/
- [ ] `INSTAGRAM_ACCESS_TOKEN` + `INSTAGRAM_APP_ID` - https://developers.facebook.com/
- [ ] `KALSHI_API_KEY` + `KALSHI_API_SECRET` - https://kalshi.com/
- [ ] `NEWS_API_KEY` - https://newsapi.org/

---

## 🔗 Quick Links (Click to Open)

### Required:
- [OpenAI API Keys](https://platform.openai.com/api-keys)
- [Convex Dashboard](https://dashboard.convex.dev)

### Optional:
- [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
- [TikTok Developers](https://developers.tiktok.com/)
- [Facebook Developers](https://developers.facebook.com/)
- [NewsAPI](https://newsapi.org/)
- [Kalshi](https://kalshi.com/)

---

## 💡 Pro Tips

1. **Start with OpenAI only** - Get it working first!
2. **Add others one at a time** - Test each as you add it
3. **Use Convex dashboard** - Easiest way to manage
4. **Check logs** - See which APIs are working

---

## 🆘 Need Help?

- **Can't find Convex project?** Run `npx convex dev` to see your project
- **API key not working?** Check you copied the full key
- **401 Error?** Make sure billing is set up on OpenAI
- **Still stuck?** Check `SETUP_CREDENTIALS.md` for detailed instructions



