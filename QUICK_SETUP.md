# Quick Setup Guide

## Fastest path

You need **two** things for AI: a One Gateway token/URL (chat) and a Gemini API key (embeddings).

### 1. One Gateway (chat)

1. Run / expose your [One Gateway](https://github.com/abrown84/one-gateway) / OpenClaw host over HTTPS
2. Copy the gateway auth token
3. In Convex → Settings → Environment Variables, set:
   - `ONE_GATEWAY_TOKEN`
   - `ONE_GATEWAY_URL` (e.g. `https://gateway.yourdomain.com`)
   - `ONE_GATEWAY_MODEL=gemini-3.8-flash` (optional; this is the default)

### 2. Gemini (embeddings only)

1. Open: https://aistudio.google.com/apikey
2. Create a key
3. In Convex, set `GEMINI_API_KEY` (and optionally `GEMINI_EMBED_MODEL=gemini-embedding-2`)

### 3. Client (Vercel)

Set `VITE_CONVEX_URL` to your Convex deployment URL.

### 4. Test

```bash
npx convex run actions/testConnections:testConnections
```

### Re-index embeddings (if you previously used OpenAI)

```bash
npx convex run actions/ingestMarkets:ingestMarkets '{"cursor":null}'
```

---

## Credential checklist

### Required
- [ ] `ONE_GATEWAY_TOKEN` + `ONE_GATEWAY_URL` — chat
- [ ] `GEMINI_API_KEY` — embeddings
- [ ] `VITE_CONVEX_URL` — Vercel / local Vite

### Optional
- [ ] `ONE_GATEWAY_MODEL` (default `gemini-3.8-flash`)
- [ ] `TWITTER_BEARER_TOKEN`, `NEWS_API_KEY`, TikTok / Instagram / Kalshi keys

See `.env.example` and `README.md` for details.
