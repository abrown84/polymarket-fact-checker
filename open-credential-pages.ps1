# Open all credential pages in browser
Write-Host "Opening credential pages in your browser..." -ForegroundColor Green
Write-Host ""

# Required
Start-Process "https://platform.openai.com/api-keys"
Start-Sleep -Seconds 1

# Convex Dashboard
Start-Process "https://dashboard.convex.dev"
Start-Sleep -Seconds 1

# Optional - open in new tabs
Write-Host "Opening optional credential pages..." -ForegroundColor Yellow
Start-Process "https://developer.twitter.com/en/portal/dashboard"
Start-Sleep -Seconds 0.5
Start-Process "https://developers.tiktok.com/"
Start-Sleep -Seconds 0.5
Start-Process "https://developers.facebook.com/"
Start-Sleep -Seconds 0.5
Start-Process "https://newsapi.org/"
Start-Sleep -Seconds 0.5
Start-Process "https://kalshi.com/"

Write-Host ""
Write-Host "All pages opened!" -ForegroundColor Green
Write-Host ""
Write-Host "Priority:" -ForegroundColor Cyan
Write-Host "1. Get OpenAI API key (REQUIRED)" -ForegroundColor Red
Write-Host "2. Add it to Convex dashboard" -ForegroundColor Yellow
Write-Host "3. Test with: npx convex run actions/testConnections:testConnections" -ForegroundColor Green
Write-Host ""
Write-Host "See QUICK_SETUP.md for step-by-step instructions!" -ForegroundColor Cyan



