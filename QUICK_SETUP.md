# Quick Setup Guide

## Fastest path

AI (chat + embeddings) goes through **One Gateway**. Defaults work against the public Brown Industries gateway; set a token only if your host requires auth.

### 1. One Gateway (chat + embeddings)

1. Optional: run your own [One Gateway](https://github.com/abrown84/one-gateway) / OpenClaw host over HTTPS
2. In Convex → Settings → Environment Variables:
   - `ONE_GATEWAY_URL=https://brwnindustries.com/labs/one-gateway` (default if unset)
   - `ONE_GATEWAY_MODEL=gemini-3.8-flash` (optional; this is the default)
   - `ONE_GATEWAY_EMBED_MODEL=gemini-embedding-2` (optional; 3072-d)
   - `ONE_GATEWAY_TOKEN` — **optional**; only set if the gateway requires a bearer token

### 2. Client (Vercel)

Set `VITE_CONVEX_URL` to your Convex deployment URL.

### 3. Test

```bash
npx convex run actions/testConnections:testConnections
```

### Embeddings heal automatically

Gateway Gemini embeddings are **3072-d**. The `heal-embeddings` cron re-indexes mismatches in small batches; keyword fallback covers pending markets in search. Check:

```bash
npx convex run queries:getIngestStatus
```

---

## Credential checklist

### Required
- [ ] `VITE_CONVEX_URL` — Vercel / local Vite

### Recommended (Convex)
- [ ] `ONE_GATEWAY_URL` (defaults to `https://brwnindustries.com/labs/one-gateway`)
- [ ] `ONE_GATEWAY_TOKEN` — only if your gateway requires auth

### Optional
- [ ] `ONE_GATEWAY_MODEL` (default `gemini-3.8-flash`)
- [ ] `ONE_GATEWAY_EMBED_MODEL` (default `gemini-embedding-2`)
- [ ] `TWITTER_BEARER_TOKEN`, `NEWS_API_KEY`, TikTok / Instagram / Kalshi keys

See `.env.example` and `README.md` for details.
