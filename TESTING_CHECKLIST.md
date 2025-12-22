# Testing Checklist for Multi-Source Fact Checker

## ✅ Data Source Integration Tests

### 1. **Reddit Integration**
- [ ] Reddit API returns posts without authentication
- [ ] Posts are properly parsed and stored
- [ ] Relevance scoring works correctly
- [ ] NSFW content is filtered
- [ ] RedditFeed component displays posts correctly
- [ ] Links to Reddit work properly

### 2. **Twitter Integration**
- [ ] Twitter API key is configured (optional - gracefully handles missing key)
- [ ] Tweets are fetched and parsed correctly
- [ ] Author information is extracted properly
- [ ] Engagement metrics (likes, retweets) are captured
- [ ] TwitterFeed component displays tweets correctly
- [ ] Links to Twitter work properly

### 3. **TikTok Integration**
- [ ] TikTok API credentials are configured (optional - gracefully handles missing credentials)
- [ ] Videos are fetched and parsed correctly
- [ ] Video metadata (likes, views, comments) is captured
- [ ] TikTokFeed component displays videos correctly
- [ ] Links to TikTok work properly

### 4. **Instagram Integration**
- [ ] Instagram API credentials are configured (optional - gracefully handles missing credentials)
- [ ] Posts are fetched and parsed correctly
- [ ] Media type is captured correctly
- [ ] Engagement metrics are captured
- [ ] InstagramFeed component displays posts correctly
- [ ] Links to Instagram work properly

### 5. **Kalshi Integration**
- [ ] Kalshi API credentials are configured (optional - gracefully handles missing credentials)
- [ ] Markets are fetched and parsed correctly
- [ ] Market prices and volumes are captured
- [ ] KalshiMarkets component displays markets correctly
- [ ] Links to Kalshi work properly

### 6. **News Integration** (Already tested)
- [ ] News articles are fetched from multiple sources
- [ ] RSS feeds are parsed correctly
- [ ] NewsAPI integration works
- [ ] NewsSources component displays articles correctly

### 7. **Polymarket Integration** (Already tested)
- [ ] Markets are fetched from Polymarket
- [ ] Market prices and evidence are retrieved
- [ ] MarketsSection component displays markets correctly

## ✅ UI Component Tests

### 1. **DataSourceOverview Component**
- [ ] Displays correct counts for each source
- [ ] Shows visual indicators for data availability
- [ ] Color coding is correct for each source
- [ ] Handles missing data gracefully

### 2. **ResultCard Component**
- [ ] Displays all data sources when available
- [ ] Grid/List view toggle works
- [ ] Source filtering tabs work correctly
- [ ] Handles empty results gracefully
- [ ] All components render without errors

### 3. **Individual Feed Components**
- [ ] RedditFeed renders correctly
- [ ] TwitterFeed renders correctly
- [ ] TikTokFeed renders correctly
- [ ] InstagramFeed renders correctly
- [ ] KalshiMarkets renders correctly
- [ ] NewsSources renders correctly
- [ ] MarketsSection renders correctly

## ✅ Data Flow Tests

### 1. **factCheck Action**
- [ ] All data sources are fetched in parallel
- [ ] Errors in one source don't break others
- [ ] Caching works correctly (30-minute TTL)
- [ ] Data is properly stored in database
- [ ] AI answer generation includes all sources

### 2. **Database Schema**
- [ ] Reddit posts are stored correctly
- [ ] TikTok videos are stored correctly
- [ ] Instagram posts are stored correctly
- [ ] All indexes work correctly
- [ ] Query hashes are used for caching

### 3. **Mutations**
- [ ] upsertRedditPost works correctly
- [ ] upsertTikTokVideo works correctly
- [ ] upsertInstagramPost works correctly
- [ ] Updates existing records when relevance score improves

## ✅ Error Handling Tests

### 1. **API Failures**
- [ ] Missing API keys are handled gracefully
- [ ] Network errors don't crash the app
- [ ] Rate limiting is handled
- [ ] Timeout errors are caught

### 2. **Data Validation**
- [ ] Missing fields are handled with null/undefined checks
- [ ] Invalid data types are caught
- [ ] Empty arrays are handled correctly

### 3. **Component Errors**
- [ ] Components handle missing props gracefully
- [ ] Null/undefined data doesn't break rendering
- [ ] Error boundaries catch component errors

## ✅ Performance Tests

### 1. **Loading States**
- [ ] Loading indicators show during data fetch
- [ ] Multiple sources load in parallel
- [ ] Caching reduces redundant API calls

### 2. **Rendering Performance**
- [ ] Large lists render efficiently
- [ ] Animations are smooth
- [ ] No unnecessary re-renders

## ✅ Integration Tests

### 1. **End-to-End Flow**
- [ ] User submits a question
- [ ] All data sources are queried
- [ ] Results are displayed correctly
- [ ] All links work properly
- [ ] Data persists in database

### 2. **Edge Cases**
- [ ] Question with no matching markets
- [ ] Question with only some sources having data
- [ ] Question that triggers all sources
- [ ] Very long questions
- [ ] Special characters in questions

## 🔧 Configuration Checklist

### Environment Variables Needed:
- [ ] `TWITTER_BEARER_TOKEN` (optional)
- [ ] `TIKTOK_API_KEY` (optional)
- [ ] `TIKTOK_API_SECRET` (optional)
- [ ] `INSTAGRAM_ACCESS_TOKEN` (optional)
- [ ] `INSTAGRAM_APP_ID` (optional)
- [ ] `KALSHI_API_KEY` (optional)
- [ ] `KALSHI_API_SECRET` (optional)
- [ ] `NEWS_API_KEY` (optional)
- [ ] `OPENAI_API_KEY` (required)
- [ ] `OPENROUTER_API_KEY` (required)

### Note:
- Reddit works without API keys (public API)
- All other sources gracefully handle missing credentials
- The app should work even if only some sources are configured

## 🐛 Known Issues to Watch For

1. **Reddit API**: May rate limit if too many requests
2. **Twitter API**: Requires valid bearer token
3. **TikTok API**: Research API access may be limited
4. **Instagram API**: Requires business/creator account
5. **Kalshi API**: Requires account and API credentials

## 📝 Test Queries to Try

1. "Will the Fed cut rates by March 2026?"
2. "Will Trump win the 2024 election?"
3. "Will Bitcoin reach $100k by 2025?"
4. "Will there be a recession in 2024?"
5. "Will AI replace most jobs by 2030?"

Each query should trigger different combinations of data sources.



