# Interactive script to help set up optional credentials
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Optional Credentials Setup Helper" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "This will help you set up:" -ForegroundColor Yellow
Write-Host "  1. Twitter/X Bearer Token" -ForegroundColor White
Write-Host "  2. TikTok API Credentials" -ForegroundColor White
Write-Host "  3. Instagram API Credentials" -ForegroundColor White
Write-Host "  4. Kalshi API Credentials" -ForegroundColor White
Write-Host "  5. NewsAPI Key" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Which one do you want to set up? (1-5, or 'all' for all links)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Opening Twitter Developer Portal..." -ForegroundColor Green
        Start-Process "https://developer.twitter.com/en/portal/dashboard"
        Write-Host ""
        Write-Host "Steps:" -ForegroundColor Yellow
        Write-Host "1. Sign up for Twitter Developer account" -ForegroundColor White
        Write-Host "2. Create a Project" -ForegroundColor White
        Write-Host "3. Create an App" -ForegroundColor White
        Write-Host "4. Go to 'Keys and Tokens' → Generate Bearer Token" -ForegroundColor White
        Write-Host "5. Copy the token and add to Convex as: TWITTER_BEARER_TOKEN" -ForegroundColor White
        Write-Host ""
        Write-Host "Opening Convex Dashboard..." -ForegroundColor Green
        Start-Sleep -Seconds 2
        Start-Process "https://dashboard.convex.dev"
    }
    "2" {
        Write-Host ""
        Write-Host "Opening TikTok Developers..." -ForegroundColor Green
        Start-Process "https://developers.tiktok.com/"
        Write-Host ""
        Write-Host "Steps:" -ForegroundColor Yellow
        Write-Host "1. Sign up for TikTok for Developers" -ForegroundColor White
        Write-Host "2. Create an App" -ForegroundColor White
        Write-Host "3. Get Client Key (API Key)" -ForegroundColor White
        Write-Host "4. Get Client Secret (API Secret)" -ForegroundColor White
        Write-Host "5. Add to Convex: TIKTOK_API_KEY and TIKTOK_API_SECRET" -ForegroundColor White
        Write-Host ""
        Write-Host "Opening Convex Dashboard..." -ForegroundColor Green
        Start-Sleep -Seconds 2
        Start-Process "https://dashboard.convex.dev"
    }
    "3" {
        Write-Host ""
        Write-Host "Opening Facebook Developers..." -ForegroundColor Green
        Start-Process "https://developers.facebook.com/"
        Write-Host ""
        Write-Host "Steps:" -ForegroundColor Yellow
        Write-Host "1. Create a Facebook App" -ForegroundColor White
        Write-Host "2. Add Instagram product" -ForegroundColor White
        Write-Host "3. Get App ID from Settings → Basic" -ForegroundColor White
        Write-Host "4. Generate Access Token from Graph API Explorer" -ForegroundColor White
        Write-Host "5. Add to Convex: INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_APP_ID" -ForegroundColor White
        Write-Host ""
        Write-Host "Note: Requires Instagram Business/Creator account" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Opening Convex Dashboard..." -ForegroundColor Green
        Start-Sleep -Seconds 2
        Start-Process "https://dashboard.convex.dev"
    }
    "4" {
        Write-Host ""
        Write-Host "Opening Kalshi..." -ForegroundColor Green
        Start-Process "https://kalshi.com/"
        Write-Host ""
        Write-Host "Steps:" -ForegroundColor Yellow
        Write-Host "1. Sign up for Kalshi account" -ForegroundColor White
        Write-Host "2. Navigate to API settings (check documentation)" -ForegroundColor White
        Write-Host "3. Generate API Key and Secret" -ForegroundColor White
        Write-Host "4. Add to Convex: KALSHI_API_KEY and KALSHI_API_SECRET" -ForegroundColor White
        Write-Host ""
        Write-Host "Opening Convex Dashboard..." -ForegroundColor Green
        Start-Sleep -Seconds 2
        Start-Process "https://dashboard.convex.dev"
    }
    "5" {
        Write-Host ""
        Write-Host "Opening NewsAPI..." -ForegroundColor Green
        Start-Process "https://newsapi.org/"
        Write-Host ""
        Write-Host "Steps:" -ForegroundColor Yellow
        Write-Host "1. Sign up for free account (2 minutes!)" -ForegroundColor White
        Write-Host "2. Get API key from dashboard" -ForegroundColor White
        Write-Host "3. Add to Convex as: NEWS_API_KEY" -ForegroundColor White
        Write-Host ""
        Write-Host "This is the fastest one - only takes 2 minutes!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Opening Convex Dashboard..." -ForegroundColor Green
        Start-Sleep -Seconds 2
        Start-Process "https://dashboard.convex.dev"
    }
    "all" {
        Write-Host ""
        Write-Host "Opening all credential pages..." -ForegroundColor Green
        Start-Process "https://developer.twitter.com/en/portal/dashboard"
        Start-Sleep -Seconds 1
        Start-Process "https://developers.tiktok.com/"
        Start-Sleep -Seconds 1
        Start-Process "https://developers.facebook.com/"
        Start-Sleep -Seconds 1
        Start-Process "https://kalshi.com/"
        Start-Sleep -Seconds 1
        Start-Process "https://newsapi.org/"
        Start-Sleep -Seconds 1
        Start-Process "https://dashboard.convex.dev"
        Write-Host ""
        Write-Host "All pages opened! See SETUP_OPTIONAL_CREDENTIALS.md for detailed steps." -ForegroundColor Cyan
    }
    default {
        Write-Host "Invalid choice. Please run again and choose 1-5 or 'all'" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Follow the steps above to get your credentials" -ForegroundColor White
Write-Host "2. Add them to Convex Dashboard → Settings → Environment Variables" -ForegroundColor White
Write-Host "3. Test with: npx convex run actions/testConnections:testConnections" -ForegroundColor White
Write-Host ""
Write-Host "See SETUP_OPTIONAL_CREDENTIALS.md for detailed instructions!" -ForegroundColor Yellow
Write-Host ""



