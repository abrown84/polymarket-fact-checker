# Setup Optional Credentials - Step by Step

## 🎯 Goal: Add Twitter, TikTok, Instagram, Kalshi, and NewsAPI

Follow these steps in order. Each one takes 5-10 minutes.

---

## 1. Twitter/X Bearer Token

### Steps:
1. **Go to:** https://developer.twitter.com/en/portal/dashboard
2. **Sign up** for a Twitter Developer account (free)
   - Use your Twitter/X account
   - Fill out the application form
   - Accept terms
3. **Create a Project:**
   - Click "Create Project"
   - Name it (e.g., "Polymarket Fact Checker")
   - Select use case: "Making a bot" or "Exploring the API"
4. **Create an App:**
   - Click "Create App" in your project
   - Name it (e.g., "FactChecker")
5. **Get Bearer Token:**
   - Go to "Keys and Tokens" tab
   - Under "Bearer Token", click "Generate"
   - Copy the token (starts with `AAAAAAAAAAAAAAAAAAAAA...`)

### Add to Convex:
- **Variable Name:** `TWITTER_BEARER_TOKEN`
- **Value:** (paste your bearer token)

**Time:** ~10 minutes (includes approval wait)

---

## 2. TikTok API Credentials

### Steps:
1. **Go to:** https://developers.tiktok.com/
2. **Sign up** for TikTok for Developers
3. **Create an App:**
   - Click "Create App"
   - Fill out application
   - Select "Research API" if available
4. **Get Credentials:**
   - Go to "App Management"
   - Find your **Client Key** (API Key)
   - Find your **Client Secret** (API Secret)

### Add to Convex:
- **Variable Name:** `TIKTOK_API_KEY`
- **Value:** (your client key)

- **Variable Name:** `TIKTOK_API_SECRET`
- **Value:** (your client secret)

**Note:** TikTok Research API may require special access/approval

**Time:** ~15 minutes (may require approval)

---

## 3. Instagram API Credentials

### Steps:
1. **Go to:** https://developers.facebook.com/
2. **Create a Facebook App:**
   - Click "My Apps" → "Create App"
   - Select "Business" type
   - Name it (e.g., "Polymarket Fact Checker")
3. **Add Instagram Product:**
   - In your app dashboard, click "Add Product"
   - Find "Instagram" → Click "Set Up"
   - Choose "Instagram Basic Display" or "Instagram Graph API"
4. **Get Credentials:**
   - Go to "Settings" → "Basic"
   - Copy **App ID**
   - Go to "Tools" → "Graph API Explorer"
   - Generate **Access Token**

### Requirements:
- You need an Instagram Business or Creator account
- Connect it to a Facebook Page

### Add to Convex:
- **Variable Name:** `INSTAGRAM_ACCESS_TOKEN`
- **Value:** (your access token)

- **Variable Name:** `INSTAGRAM_APP_ID`
- **Value:** (your app ID)

**Time:** ~20 minutes (requires business account setup)

---

## 4. Kalshi API Credentials

### Steps:
1. **Go to:** https://kalshi.com/
2. **Sign up** for a Kalshi account
3. **Navigate to API Settings:**
   - Check Kalshi documentation for exact location
   - May be under "Account Settings" → "API"
4. **Generate API Key:**
   - Create new API key
   - Copy the **API Key**
   - Copy the **API Secret**

### Add to Convex:
- **Variable Name:** `KALSHI_API_KEY`
- **Value:** (your API key)

- **Variable Name:** `KALSHI_API_SECRET`
- **Value:** (your API secret)

**Note:** Kalshi API access may require account verification

**Time:** ~10 minutes

---

## 5. NewsAPI Key

### Steps:
1. **Go to:** https://newsapi.org/
2. **Sign up** for free account
3. **Get API Key:**
   - After signup, go to dashboard
   - Your API key is displayed
   - Copy it

### Add to Convex:
- **Variable Name:** `NEWS_API_KEY`
- **Value:** (your API key)

**Free Tier:** 100 requests/day (plenty for testing)

**Time:** ~2 minutes (fastest one!)

---

## 📋 Quick Checklist

As you complete each one, check it off:

### Twitter/X
- [ ] Signed up for Twitter Developer account
- [ ] Created project and app
- [ ] Generated Bearer Token
- [ ] Added `TWITTER_BEARER_TOKEN` to Convex

### TikTok
- [ ] Signed up for TikTok Developers
- [ ] Created app
- [ ] Got Client Key and Secret
- [ ] Added `TIKTOK_API_KEY` to Convex
- [ ] Added `TIKTOK_API_SECRET` to Convex

### Instagram
- [ ] Created Facebook App
- [ ] Added Instagram product
- [ ] Got App ID and Access Token
- [ ] Added `INSTAGRAM_ACCESS_TOKEN` to Convex
- [ ] Added `INSTAGRAM_APP_ID` to Convex

### Kalshi
- [ ] Signed up for Kalshi account
- [ ] Generated API credentials
- [ ] Added `KALSHI_API_KEY` to Convex
- [ ] Added `KALSHI_API_SECRET` to Convex

### NewsAPI
- [ ] Signed up for NewsAPI
- [ ] Got API key
- [ ] Added `NEWS_API_KEY` to Convex

---

## 🚀 How to Add to Convex

For each credential:

1. **Go to:** https://dashboard.convex.dev
2. **Select your project**
3. **Navigate to:** Settings → Environment Variables
4. **Click:** "Add Variable"
5. **Enter:**
   - **Name:** (the variable name from above)
   - **Value:** (paste your credential)
6. **Click:** "Save"

Repeat for each credential!

---

## 🧪 Test After Adding Each One

After adding credentials, test them:

```bash
npx convex run actions/testConnections:testConnections
```

Or test a fact-check query to see if the new data sources appear!

---

## 💡 Pro Tips

1. **Start with NewsAPI** - It's the fastest (2 minutes)
2. **Do Twitter next** - Most commonly used
3. **Save all credentials** - Keep them in a secure password manager
4. **Test as you go** - Don't wait until the end
5. **Some may require approval** - Be patient with TikTok/Instagram

---

## 🔗 Direct Links

- [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
- [TikTok Developers](https://developers.tiktok.com/)
- [Facebook Developers](https://developers.facebook.com/)
- [NewsAPI](https://newsapi.org/)
- [Kalshi](https://kalshi.com/)
- [Convex Dashboard](https://dashboard.convex.dev)

---

## ⚠️ Important Notes

- **Twitter:** Free tier has rate limits, but works for testing
- **TikTok:** Research API may require special access
- **Instagram:** Requires business/creator account
- **Kalshi:** May require account verification
- **NewsAPI:** Free tier is 100 requests/day

All of these gracefully skip if credentials aren't set, so don't worry if some don't work immediately!



