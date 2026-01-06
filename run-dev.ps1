$ErrorActionPreference = "Stop"

# Forces the correct Node.js (fixes "fetch is not defined" / old Node picked from PATH)
$nodeDir = "C:\Program Files\nodejs"
$npm = Join-Path $nodeDir "npm.cmd"

if (-not (Test-Path $npm)) {
  Write-Host "Node.js not found at $npm" -ForegroundColor Red
  Write-Host "Install Node.js LTS from https://nodejs.org/ then re-run." -ForegroundColor Yellow
  exit 1
}

$env:PATH = "$nodeDir;$env:PATH"

Write-Host "Using Node:" -ForegroundColor Cyan
& (Join-Path $nodeDir "node.exe") -v

Write-Host "`nStarting dev (Convex + Vite)..." -ForegroundColor Cyan
& $npm run dev

