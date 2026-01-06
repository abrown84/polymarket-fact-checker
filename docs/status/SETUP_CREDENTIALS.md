# Complete Credential Setup Guide

## 🔴 Required Credentials

### 1. OpenAI API Key (REQUIRED)

**Steps:**
1. Go to https://platform.openai.com/
2. Sign up or log in
3. Navigate to **API Keys** (https://platform.openai.com/api-keys)
4. Click **"Create new secret key"**
5. Name it (e.g., "Polymarket Fact Checker")
6. Copy the key (starts with `sk-`)
7. **Add to Convex:** See "How to Add to Convex" section below

**Cost:** Pay-as-you-go, very affordable for small projects
**Free Tier:** $5 free credit for new accounts

---

## 🟡 Optional Credentials (App works without these)

### 2. Twitter/X Bearer Token

**Steps:**
1. Go to https://developer.twitter.com/en/portal/dashboard
2. Sign up for a Developer Account (free)
3. Create a new Project/App
4. Go to **Keys and Tokens** tab
5. Generate **Bearer Token**
6. Copy the token (starts with `AAAAAAAAAAAAAAAAAAAAA...`)

**Note:** Twitter API v2 requires approval for elevated access (free tier available)

---

### 3. TikTok API Credentials

**Steps:**
1. Go to https://developers.tiktok.com/
2. Sign up for TikTok for Developers
3. Create an app
4. Get **Client Key** and **Client Secret**
5. Note: TikTok Research API requires special access/approval

**Note:** TikTok API access may be limited. The app gracefully handles missing credentials.

---

### 4. Instagram API Credentials

**Steps:**
1. Go to https://developers.facebook.com/
2. Create a Facebook App
3. Add **Instagram Basic Display** or **Instagram Graph API** product
4. Get **Access Token** and **App ID**
5. Requires Instagram Business/Creator account connected to Facebook Page

**Note:** Instagram API requires business account setup. The app gracefully handles missing credentials.

---

### 5. Kalshi API Credentials

**Steps:**
1. Go to https://kalshi.com/
2. Sign up for an account
3. Navigate to API settings (check Kalshi documentation)
4. Generate API key and secret
5. Note: Kalshi API may require account verification

**Note:** Kalshi API access may require account approval. The app gracefully handles missing credentials.

---

### 6. NewsAPI Key (Optional Enhancement)

**Steps:**
1. Go to https://newsapi.org/
2. Sign up for free account
3. Get your API key from dashboard
4. Free tier: 100 requests/day

**Note:** RSS feeds work without this, but NewsAPI provides additional sources.

---

## 📝 How to Add Credentials to Convex

### Method 1: Convex Dashboard (Recommended)

1. Go to your Convex project dashboard: https://dashboard.convex.dev
2. Select your project
3. Navigate to **Settings** → **Environment Variables**
4. Click **"Add Variable"** for each credential
5. Enter:
   - **Name:** The environment variable name (e.g., `OPENAI_API_KEY`)
   - **Value:** The actual credential value
6. Click **"Save"**

### Method 2: Convex CLI (Alternative)

You can also set environment variables via CLI, but dashboard is easier.

---

## 🔐 Credential Checklist

Copy this checklist and check off as you complete:

### Required:
- [ ] `OPENAI_API_KEY` - Get from https://platform.openai.com/api-keys

### Optional (App works without these):
- [ ] `TWITTER_BEARER_TOKEN` - Get from https://developer.twitter.com/
- [ ] `TIKTOK_API_KEY` - Get from https://developers.tiktok.com/
- [ ] `TIKTOK_API_SECRET` - Get from https://developers.tiktok.com/
- [ ] `INSTAGRAM_ACCESS_TOKEN` - Get from https://developers.facebook.com/
- [ ] `INSTAGRAM_APP_ID` - Get from https://developers.facebook.com/
- [ ] `KALSHI_API_KEY` - Get from Kalshi account
- [ ] `KALSHI_API_SECRET` - Get from Kalshi account
- [ ] `NEWS_API_KEY` - Get from https://newsapi.org/

### Optional Model Configuration:
- [ ] `OPENAI_CHAT_MODEL` - Default: `gpt-4o-mini` (optional)
- [ ] `OPENAI_EMBED_MODEL` - Default: `text-embedding-3-small` (optional)

---

## 🚀 Quick Start (Minimum Setup)

**Minimum to get started:**
1. Get `OPENAI_API_KEY` (5 minutes)
2. Add to Convex dashboard
3. Done! App will work with:
   - Polymarket markets ✅
   - Reddit posts ✅
   - News from RSS ✅
   - AI fact-checking ✅

**All other credentials are optional** - the app gracefully skips them if not configured.

---

## 🧪 Test Your Setup

After adding credentials, test them:

```bash
npx convex run actions/testConnections:testConnections
```

This will test:
- ✅ Polymarket APIs (no key needed)
- ✅ OpenAI APIs (requires OPENAI_API_KEY)
- ✅ Convex Database (always works)

---

## 💡 Tips

1. **Start with OpenAI only** - Get the app working first
2. **Add others gradually** - Test each one as you add it
3. **Keep keys secure** - Never commit to git
4. **Use Convex dashboard** - Easiest way to manage credentials
5. **Check logs** - Convex logs will show which APIs are working

---

## 🔍 Verify Credentials Are Set

Check in Convex dashboard:
1. Go to **Settings** → **Environment Variables**
2. You should see all your added variables
3. Values are hidden (showing as `•••••`) for security

---

## ❓ Troubleshooting

### "OPENAI_API_KEY environment variable is required"
- Make sure you added it to Convex dashboard
- Check spelling: `OPENAI_API_KEY` (not `OPENROUTER_API_KEY`)
- Redeploy if needed

### "API error: 401 Unauthorized"
- Check that your API key is correct
- Make sure you copied the full key
- For OpenAI: Check you have credits/billing set up

### "API error: 429 Rate Limit"
- You've hit rate limits
- Wait a bit and try again
- Consider upgrading your API plan

---

## 📚 Additional Resources

- OpenAI API Docs: https://platform.openai.com/docs
- Twitter API Docs: https://developer.twitter.com/en/docs
- TikTok API Docs: https://developers.tiktok.com/doc/
- Instagram API Docs: https://developers.facebook.com/docs/instagram-api
- NewsAPI Docs: https://newsapi.org/docs



