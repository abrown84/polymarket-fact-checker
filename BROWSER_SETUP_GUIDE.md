# 🌐 Browser Setup Guide - Step by Step

All pages should now be open in Chrome. Follow these steps in order.

---

## 📋 Tab Guide

You should have these tabs open:
1. **NewsAPI** - Start here! (Fastest)
2. **Twitter Developer** 
3. **TikTok Developers**
4. **Facebook Developers** (for Instagram)
5. **Kalshi**
6. **Convex Dashboard** - Add credentials here

---

## 1️⃣ NewsAPI (Tab 1) - 2 MINUTES ⚡

### Steps:
1. **Click "Get API Key"** (big button on homepage)
2. **Sign up:**
   - Enter email
   - Create password
   - Verify email
3. **Get your key:**
   - After login, you'll see your API key on the dashboard
   - It looks like: `abc123def456...`
   - **Copy it!**

### Add to Convex (Tab 6):
1. Go to Convex Dashboard tab
2. **Settings** → **Environment Variables**
3. Click **"Add Variable"**
4. **Name:** `NEWS_API_KEY`
5. **Value:** (paste your key)
6. Click **"Save"**

✅ **Done!** Check this off: [ ]

---

## 2️⃣ Twitter/X (Tab 2) - 10 MINUTES

### Steps:
1. **Sign up for Developer Account:**
   - Click "Sign up" or "Get started"
   - Use your Twitter/X account
   - Fill out application form
   - Accept terms
   - Wait for approval (usually instant)

2. **Create a Project:**
   - Click "Create Project"
   - Name: "Polymarket Fact Checker"
   - Use case: "Making a bot" or "Exploring the API"
   - Click "Next"

3. **Create an App:**
   - Click "Create App"
   - Name: "FactChecker" (or any name)
   - Click "Create"

4. **Get Bearer Token:**
   - Go to **"Keys and Tokens"** tab
   - Scroll to **"Bearer Token"** section
   - Click **"Generate"**
   - **Copy the token** (starts with `AAAAAAAAAAAAAAAAAAAAA...`)
   - ⚠️ **Save it now** - you won't see it again!

### Add to Convex (Tab 6):
1. Go to Convex Dashboard tab
2. **Settings** → **Environment Variables**
3. Click **"Add Variable"**
4. **Name:** `TWITTER_BEARER_TOKEN`
5. **Value:** (paste your bearer token)
6. Click **"Save"**

✅ **Done!** Check this off: [ ]

---

## 3️⃣ Kalshi (Tab 5) - 10 MINUTES

### Steps:
1. **Sign up:**
   - Click "Sign up" or "Get started"
   - Create account
   - Verify email if needed

2. **Find API Settings:**
   - Look for "API" or "Developer" section
   - May be under Account Settings
   - Check Kalshi documentation if needed

3. **Generate API Credentials:**
   - Create new API key
   - Copy **API Key**
   - Copy **API Secret**

### Add to Convex (Tab 6):
1. Go to Convex Dashboard tab
2. **Settings** → **Environment Variables**
3. Click **"Add Variable"**
4. **Name:** `KALSHI_API_KEY`
5. **Value:** (paste your API key)
6. Click **"Save"**
7. Repeat for **`KALSHI_API_SECRET`**

✅ **Done!** Check this off: [ ]

---

## 4️⃣ TikTok (Tab 3) - 15 MINUTES

### Steps:
1. **Sign up:**
   - Click "Sign up" or "Get started"
   - Create TikTok for Developers account
   - Verify email

2. **Create an App:**
   - Click "Create App"
   - Fill out application form
   - Select "Research API" if available
   - Submit for approval (may take time)

3. **Get Credentials:**
   - Go to "App Management"
   - Find your app
   - Copy **Client Key** (this is your API Key)
   - Copy **Client Secret** (this is your API Secret)

### Add to Convex (Tab 6):
1. Go to Convex Dashboard tab
2. **Settings** → **Environment Variables**
3. Click **"Add Variable"**
4. **Name:** `TIKTOK_API_KEY`
5. **Value:** (paste your client key)
6. Click **"Save"**
7. Repeat for **`TIKTOK_API_SECRET`** (use client secret)

✅ **Done!** Check this off: [ ]

**Note:** TikTok Research API may require special approval. If you can't get it immediately, that's okay - the app works without it!

---

## 5️⃣ Instagram (Tab 4) - 20 MINUTES

### Prerequisites:
- Instagram Business or Creator account
- Facebook Page connected to Instagram

### Steps:
1. **Create Facebook App:**
   - Click "My Apps" → "Create App"
   - Select **"Business"** type
   - Name: "Polymarket Fact Checker"
   - Click "Create"

2. **Add Instagram Product:**
   - In app dashboard, find "Add Product"
   - Look for **"Instagram"**
   - Click **"Set Up"**
   - Choose "Instagram Basic Display" or "Instagram Graph API"

3. **Get App ID:**
   - Go to **"Settings"** → **"Basic"**
   - Copy **App ID** (looks like: `1234567890123456`)

4. **Get Access Token:**
   - Go to **"Tools"** → **"Graph API Explorer"**
   - Select your app
   - Generate **Access Token**
   - Copy it

### Add to Convex (Tab 6):
1. Go to Convex Dashboard tab
2. **Settings** → **Environment Variables**
3. Click **"Add Variable"**
4. **Name:** `INSTAGRAM_ACCESS_TOKEN`
5. **Value:** (paste your access token)
6. Click **"Save"**
7. Repeat for **`INSTAGRAM_APP_ID`** (use your app ID)

✅ **Done!** Check this off: [ ]

**Note:** If you don't have a business account, you can skip this one. The app works fine without it!

---

## ✅ Final Checklist

After completing all, verify in Convex Dashboard:

- [ ] `NEWS_API_KEY` - Added
- [ ] `TWITTER_BEARER_TOKEN` - Added
- [ ] `KALSHI_API_KEY` - Added
- [ ] `KALSHI_API_SECRET` - Added
- [ ] `TIKTOK_API_KEY` - Added (if approved)
- [ ] `TIKTOK_API_SECRET` - Added (if approved)
- [ ] `INSTAGRAM_ACCESS_TOKEN` - Added (if you have business account)
- [ ] `INSTAGRAM_APP_ID` - Added (if you have business account)

---

## 🧪 Test Everything

After adding credentials, test:

```bash
npx convex run actions/testConnections:testConnections
```

Then try a fact-check query to see all the new data sources!

---

## 💡 Tips

- **Start with NewsAPI** - It's the fastest (2 minutes)
- **Do one at a time** - Don't try to do all at once
- **Save credentials** - Keep them in a password manager
- **Some need approval** - TikTok/Instagram may take time
- **It's okay to skip some** - App works without all of them!

---

## 🆘 Troubleshooting

**Can't find API settings?**
- Check the documentation for each service
- Look in Account Settings or Developer sections
- Some services require account verification first

**API key not working?**
- Make sure you copied the full key
- Check for extra spaces
- Verify the key hasn't expired

**Still stuck?**
- See `SETUP_OPTIONAL_CREDENTIALS.md` for more details
- Check each service's documentation
- Remember: All of these are optional!



