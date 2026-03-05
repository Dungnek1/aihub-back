# Script to sync DATABASE_URL_LOCAL in .env.dev with credentials from .env.docker
# This ensures local development uses the same credentials as the Docker PostgreSQL container

Write-Host "🔄 Syncing DATABASE_URL_LOCAL with Docker PostgreSQL credentials..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Read credentials from .env.docker (used by docker-compose.dev.yml)
$envDockerPath = ".env.docker"
$postgresUser = "postgres"
$postgresPassword = "postgres"
$postgresDb = "ai_hub_db"

if (Test-Path $envDockerPath) {
    Write-Host "📖 Reading credentials from $envDockerPath..." -ForegroundColor Yellow
    $envDockerLines = Get-Content $envDockerPath
    
    foreach ($line in $envDockerLines) {
        if ($line -match '^POSTGRES_USER=(.+)$') {
            $postgresUser = $matches[1].Trim()
        }
        if ($line -match '^POSTGRES_PASSWORD=(.+)$') {
            $postgresPassword = $matches[1].Trim()
        }
        if ($line -match '^POSTGRES_DB=(.+)$') {
            $postgresDb = $matches[1].Trim()
        }
    }
    
    Write-Host "   ✓ Found credentials:" -ForegroundColor Green
    Write-Host "     - User: $postgresUser" -ForegroundColor Gray
    Write-Host "     - Database: $postgresDb" -ForegroundColor Gray
    Write-Host "     - Password: ****" -ForegroundColor Gray
} else {
    Write-Host "⚠️  $envDockerPath not found, using default credentials" -ForegroundColor Yellow
    Write-Host "   Default: postgres/postgres/ai_hub_db" -ForegroundColor Gray
}

Write-Host ""

# Step 2: Update or create .env.dev file
$envDevPath = ".env.dev"
$databaseUrlLocal = "postgresql://${postgresUser}:${postgresPassword}@localhost:5432/${postgresDb}?schema=public"

if (-not (Test-Path $envDevPath)) {
    Write-Host "📝 Creating $envDevPath file..." -ForegroundColor Yellow
    $newContent = @(
        "# Development Environment Variables",
        "# Auto-generated - do not commit to git",
        "",
        "DATABASE_URL_LOCAL=$databaseUrlLocal"
    )
    $newContent | Out-File -FilePath $envDevPath -Encoding utf8
    Write-Host "   ✓ Created $envDevPath" -ForegroundColor Green
} else {
    Write-Host "📝 Updating $envDevPath file..." -ForegroundColor Yellow
    $lines = Get-Content $envDevPath
    $fixedLines = @()
    $foundDatabaseUrlLocal = $false
    
    foreach ($line in $lines) {
        if ($line -match '^DATABASE_URL_LOCAL=') {
            # Replace with new URL using localhost
            $fixedLines += "DATABASE_URL_LOCAL=$databaseUrlLocal"
            $foundDatabaseUrlLocal = $true
        } elseif ($line -match '^DATABASE_URL=' -and $line -match '@postgres:') {
            # Keep DATABASE_URL with postgres hostname (for Docker internal use)
            $fixedLines += $line
        } else {
            $fixedLines += $line
        }
    }
    
    # If DATABASE_URL_LOCAL not found, add it at the top
    if (-not $foundDatabaseUrlLocal) {
        $fixedLines = @("DATABASE_URL_LOCAL=$databaseUrlLocal", "") + $fixedLines
        Write-Host "   ✓ Added DATABASE_URL_LOCAL" -ForegroundColor Green
    } else {
        Write-Host "   ✓ Updated DATABASE_URL_LOCAL" -ForegroundColor Green
    }
    
    $fixedLines | Out-File -FilePath $envDevPath -Encoding utf8
}

Write-Host ""
Write-Host "✅ Successfully synced DATABASE_URL_LOCAL!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Configuration:" -ForegroundColor Cyan
Write-Host "   DATABASE_URL_LOCAL=$databaseUrlLocal" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 Tips:" -ForegroundColor Yellow
Write-Host "   - Make sure PostgreSQL container is running: docker compose -f docker-compose.dev.yml up -d postgres" -ForegroundColor Gray
Write-Host "   - Check container status: docker ps" -ForegroundColor Gray
Write-Host "   - View container logs: docker logs aihub_postgres_dev" -ForegroundColor Gray
Write-Host ""
