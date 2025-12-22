# Migration from OpenRouter to OpenAI

## ✅ Migration Complete

All OpenRouter references have been replaced with OpenAI direct API calls.

## Changes Made

### Environment Variables
- ❌ `OPENROUTER_API_KEY` → ✅ `OPENAI_API_KEY`
- ❌ `OPENROUTER_CHAT_MODEL` → ✅ `OPENAI_CHAT_MODEL` (default: `gpt-4o-mini`)
- ❌ `OPENROUTER_EMBED_MODEL` → ✅ `OPENAI_EMBED_MODEL` (default: `text-embedding-3-small`)

### API Endpoints
- ❌ `https://openrouter.ai/api/v1/chat/completions` → ✅ `https://api.openai.com/v1/chat/completions`
- ❌ `https://openrouter.ai/api/v1/embeddings` → ✅ `https://api.openai.com/v1/embeddings`

### Model Names
- ❌ `openai/gpt-4o-mini` → ✅ `gpt-4o-mini`
- ❌ `openai/text-embedding-3-small` → ✅ `text-embedding-3-small`

### Headers Removed
- Removed `HTTP-Referer` header (OpenRouter-specific)
- Removed `X-Title` header (OpenRouter-specific)

## Files Updated

1. ✅ `convex/actions/aiEmbed.ts`
2. ✅ `convex/actions/aiParseClaim.ts`
3. ✅ `convex/actions/aiRerank.ts`
4. ✅ `convex/actions/factCheck.ts`
5. ✅ `convex/actions/ingestMarkets.ts`
6. ✅ `convex/actions/testConnections.ts`
7. ✅ `API_KEYS_REQUIRED.md`

## Next Steps

1. **Update Environment Variables in Convex Dashboard:**
   - Remove: `OPENROUTER_API_KEY`
   - Add: `OPENAI_API_KEY` (get from https://platform.openai.com/api-keys)
   - Optionally set: `OPENAI_CHAT_MODEL` and `OPENAI_EMBED_MODEL` (defaults provided)

2. **Test the Connection:**
   ```bash
   npx convex run actions/testConnections:testConnections
   ```

3. **Verify All Features Work:**
   - Fact-checking queries
   - Embeddings generation
   - Claim parsing
   - Market reranking

## Benefits

- ✅ Direct OpenAI API access (no intermediary)
- ✅ Potentially lower latency
- ✅ Direct support from OpenAI
- ✅ Same functionality, cleaner integration

## Notes

- All error messages updated to reference OpenAI
- All function names updated (e.g., `testOpenAIEmbeddings`)
- All documentation updated
- No breaking changes to API structure



