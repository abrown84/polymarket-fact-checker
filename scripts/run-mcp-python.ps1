param(
  [string]$VenvPath = "mcp-server-python\\.venv"
)

$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")

$python = Join-Path $VenvPath "Scripts\\python.exe"
if (-not (Test-Path $python)) {
  Write-Host "Python venv not found at $python" -ForegroundColor Yellow
  Write-Host "Run this first:" -ForegroundColor Yellow
  Write-Host "  cd mcp-server-python" -ForegroundColor Yellow
  Write-Host "  python -m venv .venv" -ForegroundColor Yellow
  Write-Host "  .venv\\Scripts\\activate" -ForegroundColor Yellow
  Write-Host "  pip install -r requirements.txt" -ForegroundColor Yellow
  exit 1
}

& $python "mcp-server-python\\server.py"

