param(
  [string]$AccountId,
  [string]$DatabaseName
)

if (-not $AccountId -or -not $DatabaseName) {
  Write-Host "Usage: .\push_to_d1.ps1 -AccountId <CF_ACCOUNT_ID> -DatabaseName <DB_NAME>"
  exit 1
}

$env:CF_API_TOKEN = $env:CF_API_TOKEN # ensure token is set in environment
if (-not $env:CF_API_TOKEN) {
  Write-Host "Set environment variable CF_API_TOKEN with a token that has D1 permissions."
  exit 1
}

Write-Host "Executing migration d1_migrations/001_setup.sql against D1 database $DatabaseName..."
wrangler d1 execute --account-id $AccountId --database $DatabaseName --file ..\cloudflare\d1_migrations\001_setup.sql
