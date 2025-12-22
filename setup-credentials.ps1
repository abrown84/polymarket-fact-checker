# PowerShell script to help set up Convex environment variables
# This script helps you prepare credentials for Convex

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Convex Credentials Setup Helper" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Required credentials
Write-Host "🔴 REQUIRED CREDENTIALS:" -ForegroundColor Red
Write-Host ""
Write-Host "1. OpenAI API Key" -ForegroundColor Yellow
Write-Host "   - Get it from: https://platform.openai.com/api-keys" -ForegroundColor Gray
Write-Host "   - Variable name: OPENAI_API_KEY" -ForegroundColor Gray
Write-Host "   - Format: sk-..." -ForegroundColor Gray
Write-Host ""

# Optional credentials
Write-Host "🟡 OPTIONAL CREDENTIALS (App works without these):" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Twitter Bearer Token" -ForegroundColor Yellow
Write-Host "   - Get it from: https://developer.twitter.com/en/portal/dashboard" -ForegroundColor Gray
Write-Host "   - Variable name: TWITTER_BEARER_TOKEN" -ForegroundColor Gray
Write-Host ""

Write-Host "3. TikTok API Credentials" -ForegroundColor Yellow
Write-Host "   - Get from: https://developers.tiktok.com/" -ForegroundColor Gray
Write-Host "   - Variable names: TIKTOK_API_KEY, TIKTOK_API_SECRET" -ForegroundColor Gray
Write-Host ""

Write-Host "4. Instagram API Credentials" -ForegroundColor Yellow
Write-Host "   - Get from: https://developers.facebook.com/" -ForegroundColor Gray
Write-Host "   - Variable names: INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_APP_ID" -ForegroundColor Gray
Write-Host ""

Write-Host "5. Kalshi API Credentials" -ForegroundColor Yellow
Write-Host "   - Get from: https://kalshi.com/ (requires account)" -ForegroundColor Gray
Write-Host "   - Variable names: KALSHI_API_KEY, KALSHI_API_SECRET" -ForegroundColor Gray
Write-Host ""

Write-Host "6. NewsAPI Key" -ForegroundColor Yellow
Write-Host "   - Get from: https://newsapi.org/" -ForegroundColor Gray
Write-Host "   - Variable name: NEWS_API_KEY" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "HOW TO ADD TO CONVEX:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Go to: https://dashboard.convex.dev" -ForegroundColor White
Write-Host "2. Select your project" -ForegroundColor White
Write-Host "3. Navigate to: Settings → Environment Variables" -ForegroundColor White
Write-Host "4. Click 'Add Variable' for each credential" -ForegroundColor White
Write-Host "5. Enter the variable name and value" -ForegroundColor White
Write-Host "6. Click 'Save'" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "QUICK START (Minimum Setup):" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Minimum to get started:" -ForegroundColor Green
Write-Host "  ✓ Get OPENAI_API_KEY (5 minutes)" -ForegroundColor Green
Write-Host "  ✓ Add to Convex dashboard" -ForegroundColor Green
Write-Host "  ✓ Done! App will work with:" -ForegroundColor Green
Write-Host "    - Polymarket markets" -ForegroundColor Gray
Write-Host "    - Reddit posts" -ForegroundColor Gray
Write-Host "    - News from RSS" -ForegroundColor Gray
Write-Host "    - AI fact-checking" -ForegroundColor Gray
Write-Host ""

Write-Host "All other credentials are OPTIONAL!" -ForegroundColor Yellow
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST YOUR SETUP:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "After adding credentials, test with:" -ForegroundColor White
Write-Host "  npx convex run actions/testConnections:testConnections" -ForegroundColor Cyan
Write-Host ""

Write-Host "Press any key to open the Convex dashboard..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Open Convex dashboard
Start-Process "https://dashboard.convex.dev"

Write-Host ""
Write-Host "Opening Convex dashboard in your browser..." -ForegroundColor Green
Write-Host "Don't forget to also get your OpenAI API key from:" -ForegroundColor Yellow
Write-Host "https://platform.openai.com/api-keys" -ForegroundColor Cyan
Write-Host ""

