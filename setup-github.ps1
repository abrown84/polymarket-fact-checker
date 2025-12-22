# GitHub Repository Setup Script
# Run this after creating the repository on GitHub

Write-Host "Setting up GitHub remote..." -ForegroundColor Green

# Add remote (replace YOUR_USERNAME with your GitHub username if different)
git remote add origin https://github.com/abrown84/polymarket-fact-checker.git

# Push to GitHub
Write-Host "Pushing code to GitHub..." -ForegroundColor Green
git push -u origin main

Write-Host "Done! Your code is now on GitHub." -ForegroundColor Green
Write-Host "Repository URL: https://github.com/abrown84/polymarket-fact-checker" -ForegroundColor Cyan



