# Check Node.js Version for Polymarket Fact Checker
# This script helps diagnose Node.js version issues

Write-Host "`n🔍 Checking Node.js Version...`n" -ForegroundColor Cyan

# Try to get Node version (bypassing conda if possible)
$nodePaths = @(
    "C:\Program Files\nodejs\node.exe",
    "$env:ProgramFiles\nodejs\node.exe",
    "$env:LOCALAPPDATA\Programs\nodejs\node.exe"
)

$nodeFound = $false
foreach ($nodePath in $nodePaths) {
    if (Test-Path $nodePath) {
        try {
            $version = & $nodePath --version
            Write-Host "✅ Found Node.js: $version at $nodePath" -ForegroundColor Green
            $nodeFound = $true
            
            # Check if version is 18+
            $majorVersion = [int]($version -replace 'v(\d+)\..*', '$1')
            if ($majorVersion -ge 18) {
                Write-Host "✅ Node.js version is compatible (requires 18+)" -ForegroundColor Green
            } else {
                Write-Host "❌ Node.js version is too old! You need 18+ but have $version" -ForegroundColor Red
                Write-Host "`n📥 Please update Node.js:" -ForegroundColor Yellow
                Write-Host "   1. Go to https://nodejs.org/" -ForegroundColor Yellow
                Write-Host "   2. Download the LTS version (20.x or 22.x)" -ForegroundColor Yellow
                Write-Host "   3. Run the installer" -ForegroundColor Yellow
                Write-Host "   4. Restart your terminal and try again`n" -ForegroundColor Yellow
            }
            break
        } catch {
            continue
        }
    }
}

if (-not $nodeFound) {
    Write-Host "❌ Could not find Node.js installation" -ForegroundColor Red
    Write-Host "`n📥 Please install Node.js:" -ForegroundColor Yellow
    Write-Host "   1. Go to https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "   2. Download and install the LTS version`n" -ForegroundColor Yellow
}

# Check for conda interference
Write-Host "`n🔍 Checking for conda environment...`n" -ForegroundColor Cyan
if ($env:CONDA_DEFAULT_ENV) {
    Write-Host "⚠️  Conda environment detected: $env:CONDA_DEFAULT_ENV" -ForegroundColor Yellow
    Write-Host "   This might interfere with Node.js commands." -ForegroundColor Yellow
    Write-Host "   Try: conda deactivate" -ForegroundColor Yellow
}

Write-Host "`n💡 Quick Fix:" -ForegroundColor Cyan
Write-Host "   1. Update Node.js to 18+ from https://nodejs.org/" -ForegroundColor White
Write-Host "   2. Restart your terminal" -ForegroundColor White
Write-Host "   3. Run: npm install" -ForegroundColor White
Write-Host "   4. Run: npm run dev`n" -ForegroundColor White
