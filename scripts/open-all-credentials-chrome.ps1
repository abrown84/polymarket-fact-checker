# Open all credential pages in Chrome with instructions
Write-Host "Opening all credential pages in Chrome..." -ForegroundColor Green
Write-Host ""

# Start Chrome with all credential pages in separate tabs
$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chromePath)) {
    $chromePath = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
}

if (Test-Path $chromePath) {
    # Open all pages in Chrome
    Start-Process $chromePath -ArgumentList @(
        "https://newsapi.org/",
        "https://developer.twitter.com/en/portal/dashboard",
        "https://developers.tiktok.com/",
        "https://developers.facebook.com/",
        "https://kalshi.com/",
        "https://dashboard.convex.dev"
    )
    Write-Host "✅ All pages opened in Chrome!" -ForegroundColor Green
} else {
    # Fallback: use default browser
    Write-Host "Chrome not found, using default browser..." -ForegroundColor Yellow
    Start-Process "https://newsapi.org/"
    Start-Sleep -Seconds 1
    Start-Process "https://developer.twitter.com/en/portal/dashboard"
    Start-Sleep -Seconds 1
    Start-Process "https://developers.tiktok.com/"
    Start-Sleep -Seconds 1
    Start-Process "https://developers.facebook.com/"
    Start-Sleep -Seconds 1
    Start-Process "https://kalshi.com/"
    Start-Sleep -Seconds 1
    Start-Process "https://dashboard.convex.dev"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SETUP INSTRUCTIONS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Follow this order (fastest first):" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. NEWSAPI (2 minutes) - Tab 1" -ForegroundColor Green
Write-Host "   → Click 'Get API Key' → Sign up → Copy key" -ForegroundColor White
Write-Host "   → Add to Convex as: NEWS_API_KEY" -ForegroundColor White
Write-Host ""
Write-Host "2. TWITTER (10 minutes) - Tab 2" -ForegroundColor Green
Write-Host "   → Sign up → Create Project → Create App" -ForegroundColor White
Write-Host "   → Keys & Tokens → Generate Bearer Token" -ForegroundColor White
Write-Host "   → Add to Convex as: TWITTER_BEARER_TOKEN" -ForegroundColor White
Write-Host ""
Write-Host "3. KALSHI (10 minutes) - Tab 4" -ForegroundColor Green
Write-Host "   → Sign up → Find API settings → Generate credentials" -ForegroundColor White
Write-Host "   → Add to Convex: KALSHI_API_KEY, KALSHI_API_SECRET" -ForegroundColor White
Write-Host ""
Write-Host "4. TIKTOK (15 minutes) - Tab 3" -ForegroundColor Yellow
Write-Host "   → Sign up → Create App → Get Client Key & Secret" -ForegroundColor White
Write-Host "   → Add to Convex: TIKTOK_API_KEY, TIKTOK_API_SECRET" -ForegroundColor White
Write-Host ""
Write-Host "5. INSTAGRAM (20 minutes) - Tab 4" -ForegroundColor Yellow
Write-Host "   → Create Facebook App → Add Instagram → Get credentials" -ForegroundColor White
Write-Host "   → Add to Convex: INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_APP_ID" -ForegroundColor White
Write-Host ""
Write-Host "CONVEX DASHBOARD - Tab 6" -ForegroundColor Cyan
Write-Host "   → Settings → Environment Variables → Add Variable" -ForegroundColor White
Write-Host ""



