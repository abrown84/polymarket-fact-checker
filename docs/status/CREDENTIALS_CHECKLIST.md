# ✅ Credentials Setup Checklist

Print this or keep it open while you set up credentials!

---

## 🎯 Your Goal: Add 5 Optional Data Sources

**Time needed:** ~1 hour total (or do them over time)

---

## 1. NewsAPI ⚡ (2 minutes - START HERE!)

**Tab:** NewsAPI page
- [ ] Click "Get API Key"
- [ ] Sign up (email + password)
- [ ] Verify email
- [ ] Copy API key from dashboard

**Convex Dashboard:**
- [ ] Go to Settings → Environment Variables
- [ ] Add variable: `NEWS_API_KEY`
- [ ] Paste your key
- [ ] Save

**✅ DONE!** Time: ~2 minutes

---

## 2. Twitter/X (10 minutes)

**Tab:** Twitter Developer Portal
- [ ] Sign up for Developer account
- [ ] Fill out application
- [ ] Wait for approval (usually instant)
- [ ] Create Project: "Polymarket Fact Checker"
- [ ] Create App: "FactChecker"
- [ ] Go to "Keys and Tokens" tab
- [ ] Generate Bearer Token
- [ ] Copy token (starts with AAAA...)

**Convex Dashboard:**
- [ ] Add variable: `TWITTER_BEARER_TOKEN`
- [ ] Paste your token
- [ ] Save

**✅ DONE!** Time: ~10 minutes

---

## 3. Kalshi (10 minutes)

**Tab:** Kalshi website
- [ ] Sign up for account
- [ ] Verify email if needed
- [ ] Find API settings (check Account Settings or Documentation)
- [ ] Generate API Key
- [ ] Generate API Secret
- [ ] Copy both

**Convex Dashboard:**
- [ ] Add variable: `KALSHI_API_KEY`
- [ ] Paste your API key
- [ ] Save
- [ ] Add variable: `KALSHI_API_SECRET`
- [ ] Paste your API secret
- [ ] Save

**✅ DONE!** Time: ~10 minutes

---

## 4. TikTok (15 minutes - may need approval)

**Tab:** TikTok Developers
- [ ] Sign up for TikTok for Developers
- [ ] Verify email
- [ ] Create App
- [ ] Fill out application
- [ ] Wait for approval (may take time)
- [ ] Get Client Key (API Key)
- [ ] Get Client Secret (API Secret)
- [ ] Copy both

**Convex Dashboard:**
- [ ] Add variable: `TIKTOK_API_KEY`
- [ ] Paste your client key
- [ ] Save
- [ ] Add variable: `TIKTOK_API_SECRET`
- [ ] Paste your client secret
- [ ] Save

**✅ DONE!** Time: ~15 minutes (or longer if waiting for approval)

**Note:** If approval takes time, that's okay! App works without it.

---

## 5. Instagram (20 minutes - needs business account)

**Prerequisites:**
- [ ] Instagram Business or Creator account
- [ ] Facebook Page connected to Instagram

**Tab:** Facebook Developers
- [ ] Create Facebook App (Business type)
- [ ] Name it: "Polymarket Fact Checker"
- [ ] Add Instagram product
- [ ] Go to Settings → Basic
- [ ] Copy App ID
- [ ] Go to Tools → Graph API Explorer
- [ ] Generate Access Token
- [ ] Copy token

**Convex Dashboard:**
- [ ] Add variable: `INSTAGRAM_ACCESS_TOKEN`
- [ ] Paste your access token
- [ ] Save
- [ ] Add variable: `INSTAGRAM_APP_ID`
- [ ] Paste your app ID
- [ ] Save

**✅ DONE!** Time: ~20 minutes

**Note:** If you don't have a business account, skip this one!

---

## 🎉 Final Verification

After completing all, check your Convex Dashboard:

**Required (Already Done):**
- ✅ `OPENAI_API_KEY` - Already set!

**Optional (What You Just Added):**
- [ ] `NEWS_API_KEY`
- [ ] `TWITTER_BEARER_TOKEN`
- [ ] `KALSHI_API_KEY`
- [ ] `KALSHI_API_SECRET`
- [ ] `TIKTOK_API_KEY` (if approved)
- [ ] `TIKTOK_API_SECRET` (if approved)
- [ ] `INSTAGRAM_ACCESS_TOKEN` (if you have business account)
- [ ] `INSTAGRAM_APP_ID` (if you have business account)

---

## 🧪 Test Your Setup

After adding credentials, test:

```bash
npx convex run actions/testConnections:testConnections
```

Then try a fact-check query to see all your new data sources!

---

## 💡 Pro Tips

1. **Do one at a time** - Don't rush
2. **Start with NewsAPI** - Easiest win!
3. **Save credentials** - Password manager recommended
4. **It's okay to skip some** - App works without all
5. **Test as you go** - Verify each one works

---

## 📚 Need More Help?

- **Detailed guide:** `SETUP_OPTIONAL_CREDENTIALS.md`
- **Quick reference:** `CREDENTIALS_QUICK_REFERENCE.md`
- **Browser guide:** `BROWSER_SETUP_GUIDE.md`

---

**Good luck! You've got this! 🚀**



