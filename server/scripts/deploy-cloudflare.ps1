# Deploy to Cloudflare Pages
# Usage (set API token first — do NOT commit the token):
#   $env:CLOUDFLARE_API_TOKEN = "your-token-here"
#   .\scripts\deploy-cloudflare.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host "`n=== Cloudflare Pages Deploy ===`n" -ForegroundColor Cyan

if (-not $env:CLOUDFLARE_API_TOKEN) {
  Write-Host "Option A — API token (recommended):" -ForegroundColor Yellow
  Write-Host '  $env:CLOUDFLARE_API_TOKEN = "paste-your-token"'
  Write-Host "  .\scripts\deploy-cloudflare.ps1`n"
  Write-Host "Option B — browser login:" -ForegroundColor Yellow
  Write-Host "  npx wrangler login"
  Write-Host "  .\scripts\deploy-cloudflare.ps1`n"
  $try = Read-Host "Press Enter to try wrangler login now, or Ctrl+C to set token first"
  npx wrangler login
}

npx wrangler whoami
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "`nBuilding..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "`nDeploying..." -ForegroundColor Yellow
npx wrangler pages deploy client/dist --project-name dhakaltradersandsuppliers --commit-dirty=true
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "`nDone. Next in Cloudflare Dashboard:" -ForegroundColor Green
Write-Host "  1. Pages -> Settings -> Functions -> D1 binding: DB = dhakaltraders"
Write-Host "  2. Environment variable (Secret): POS_JWT_SECRET"
Write-Host "  3. npm run db:setup:remote`n"
