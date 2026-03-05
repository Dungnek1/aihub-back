# Quick fix for database credentials mismatch
# Run this script to update .env.dev with correct DATABASE_URL_LOCAL

Write-Host "🔧 Fixing database credentials..." -ForegroundColor Cyan

# Read credentials from .env.docker
$user = "postgres"
$pass = "postgres"
$db = "ai_hub_db"

if (Test-Path ".env.docker") {
    Get-Content ".env.docker" | ForEach-Object {
        if ($_ -match '^POSTGRES_USER=(.+)') { $user = $matches[1].Trim() }
        if ($_ -match '^POSTGRES_PASSWORD=(.+)') { $pass = $matches[1].Trim() }
        if ($_ -match '^POSTGRES_DB=(.+)') { $db = $matches[1].Trim() }
    }
}

$localUrl = "postgresql://${user}:${pass}@localhost:5432/${db}?schema=public"

Write-Host "📋 Database URL for local development:" -ForegroundColor Yellow
Write-Host "   $localUrl" -ForegroundColor Gray
Write-Host ""
Write-Host "📝 Add this line to your .env.dev file:" -ForegroundColor Green
Write-Host "   DATABASE_URL_LOCAL=$localUrl" -ForegroundColor White
Write-Host ""
Write-Host "💡 Or copy this command:" -ForegroundColor Yellow
Write-Host "   echo DATABASE_URL_LOCAL=$localUrl >> .env.dev" -ForegroundColor White
Write-Host ""

# Try to update .env.dev automatically
if (Test-Path ".env.dev") {
    $content = Get-Content ".env.dev" -Raw
    if ($content -match 'DATABASE_URL_LOCAL=') {
        Write-Host "⚠️  DATABASE_URL_LOCAL already exists in .env.dev" -ForegroundColor Yellow
        Write-Host "   Please update it manually to:" -ForegroundColor Yellow
        Write-Host "   DATABASE_URL_LOCAL=$localUrl" -ForegroundColor White
    } else {
        Add-Content ".env.dev" "`nDATABASE_URL_LOCAL=$localUrl"
        Write-Host "✅ Added DATABASE_URL_LOCAL to .env.dev" -ForegroundColor Green
    }
} else {
    "DATABASE_URL_LOCAL=$localUrl" | Out-File ".env.dev" -Encoding UTF8
    Write-Host "✅ Created .env.dev with DATABASE_URL_LOCAL" -ForegroundColor Green
}

Write-Host ""
Write-Host "🐳 Make sure PostgreSQL container is running:" -ForegroundColor Cyan
Write-Host "   docker compose -f docker-compose.dev.yml up -d postgres" -ForegroundColor Gray
