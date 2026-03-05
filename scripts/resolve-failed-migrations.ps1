# Script to resolve failed Prisma migrations
# Usage: powershell -ExecutionPolicy Bypass -File scripts/resolve-failed-migrations.ps1 [migration_name]

$ErrorActionPreference = "Stop"

Write-Host "Resolving failed Prisma migrations..." -ForegroundColor Cyan
Write-Host ""

# Load database credentials from .env file
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

$dbUser = [Environment]::GetEnvironmentVariable("POSTGRES_USER", "Process")
$dbPass = [Environment]::GetEnvironmentVariable("POSTGRES_PASSWORD", "Process")
$dbName = [Environment]::GetEnvironmentVariable("POSTGRES_DB", "Process")

if (-not $dbUser) { $dbUser = "postgres" }
if (-not $dbPass) { $dbPass = "postgres" }
if (-not $dbName) { $dbName = "ai_hub_db" }

$dbUrl = "postgresql://${dbUser}:${dbPass}@postgres:5432/${dbName}"

# Check if migration name is provided as argument
if ($args.Count -gt 0) {
    $migrationName = $args[0]
    Write-Host "Resolving migration: $migrationName" -ForegroundColor Cyan
} else {
    # Try to detect failed migration
    Write-Host "Checking for failed migrations..." -ForegroundColor Cyan
    $migrationOutput = docker run --rm `
      --name "migration_check_$(Get-Date -Format 'yyyyMMddHHmmss')" `
      --network traefik-network `
      -e DATABASE_URL=$dbUrl `
      -e DATABASE_URL_LOCAL=$dbUrl `
      -v "${PWD}/prisma:/app/prisma:ro" `
      -w /app `
      ai-hub-be-api-gateway:latest `
      sh -c "npx prisma migrate deploy 2>&1"
    
    # Extract migration name from error
    $migrationName = $migrationOutput | Select-String -Pattern "`(\d{14}_[a-z_]+)`" | ForEach-Object { 
        $_.Matches.Value -replace '`', ''
    } | Select-Object -First 1
    
    if (-not $migrationName) {
        # Try from migrate status
        $migrationStatus = docker run --rm `
          --name "migration_status_$(Get-Date -Format 'yyyyMMddHHmmss')" `
          --network traefik-network `
          -e DATABASE_URL=$dbUrl `
          -e DATABASE_URL_LOCAL=$dbUrl `
          -v "${PWD}/prisma:/app/prisma:ro" `
          -w /app `
          ai-hub-be-api-gateway:latest `
          sh -c "npx prisma migrate status 2>&1"
        
        $migrationName = $migrationStatus | Select-String -Pattern "failed" -CaseSensitive:$false | 
            Select-String -Pattern "(\d{14}_[a-z_]+)" | ForEach-Object { $_.Matches.Groups[1].Value } | Select-Object -First 1
    }
    
    if (-not $migrationName) {
        Write-Host "Error: Could not detect failed migration automatically" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please provide migration name manually:" -ForegroundColor Yellow
        Write-Host "  powershell -ExecutionPolicy Bypass -File scripts/resolve-failed-migrations.ps1 <migration_name>" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Example:" -ForegroundColor Yellow
        Write-Host "  powershell -ExecutionPolicy Bypass -File scripts/resolve-failed-migrations.ps1 20251117042444_add_support_contact_request" -ForegroundColor Gray
        exit 1
    }
    
    Write-Host "Detected failed migration: $migrationName" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Resolving migration: $migrationName" -ForegroundColor Cyan
Write-Host ""

# Try to resolve as rolled-back first
Write-Host "Attempt 1: Marking as rolled-back..." -ForegroundColor Yellow
$resolveOutput = docker run --rm `
  --name "migration_resolve_rolledback_$(Get-Date -Format 'yyyyMMddHHmmss')" `
  --network traefik-network `
  -e DATABASE_URL=$dbUrl `
  -e DATABASE_URL_LOCAL=$dbUrl `
  -v "${PWD}/prisma:/app/prisma:ro" `
  -w /app `
  ai-hub-be-api-gateway:latest `
  sh -c "npx prisma migrate resolve --rolled-back $migrationName 2>&1"

if ($LASTEXITCODE -ne 0 -or ($resolveOutput | Select-String -Pattern "error|failed" -CaseSensitive:$false)) {
    Write-Host "  ❌ Rolled-back failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Attempt 2: Marking as applied..." -ForegroundColor Yellow
    
    # Try as applied
    $resolveOutput = docker run --rm `
      --name "migration_resolve_applied_$(Get-Date -Format 'yyyyMMddHHmmss')" `
      --network traefik-network `
      -e DATABASE_URL=$dbUrl `
      -e DATABASE_URL_LOCAL=$dbUrl `
      -v "${PWD}/prisma:/app/prisma:ro" `
      -w /app `
      ai-hub-be-api-gateway:latest `
      sh -c "npx prisma migrate resolve --applied $migrationName 2>&1"
    
    if ($LASTEXITCODE -ne 0 -or ($resolveOutput | Select-String -Pattern "error|failed" -CaseSensitive:$false)) {
        Write-Host "  ❌ Applied also failed" -ForegroundColor Red
        Write-Host ""
        Write-Host "Error: Could not resolve migration automatically" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please resolve manually:" -ForegroundColor Yellow
        Write-Host "  docker run --rm --network traefik-network \" -ForegroundColor Gray
        Write-Host "    -e DATABASE_URL=`"$dbUrl`" \" -ForegroundColor Gray
        Write-Host "    -e DATABASE_URL_LOCAL=`"$dbUrl`" \" -ForegroundColor Gray
        Write-Host "    -v `"`${PWD}/prisma:/app/prisma:ro`" \" -ForegroundColor Gray
        Write-Host "    -w /app \" -ForegroundColor Gray
        Write-Host "    ai-hub-be-api-gateway:latest \" -ForegroundColor Gray
        Write-Host "    sh -c `"npx prisma migrate resolve --rolled-back $migrationName`"" -ForegroundColor Gray
        exit 1
    } else {
        Write-Host "  ✓ Migration resolved as applied" -ForegroundColor Green
    }
} else {
    Write-Host "  ✓ Migration resolved as rolled-back" -ForegroundColor Green
}

Write-Host ""
Write-Host "Verifying migration status..." -ForegroundColor Cyan
docker run --rm `
  --name "migration_verify_$(Get-Date -Format 'yyyyMMddHHmmss')" `
  --network traefik-network `
  -e DATABASE_URL=$dbUrl `
  -e DATABASE_URL_LOCAL=$dbUrl `
  -v "${PWD}/prisma:/app/prisma:ro" `
  -w /app `
  ai-hub-be-api-gateway:latest `
  sh -c "npx prisma migrate status"

Write-Host ""
Write-Host "✅ Migration resolved successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "You can now run migrations again:" -ForegroundColor Cyan
Write-Host "  npm run deploy:prod" -ForegroundColor Gray
Write-Host "  # or" -ForegroundColor Gray
Write-Host "  docker run --rm --network traefik-network \" -ForegroundColor Gray
Write-Host "    -e DATABASE_URL=`"$dbUrl`" \" -ForegroundColor Gray
Write-Host "    -e DATABASE_URL_LOCAL=`"$dbUrl`" \" -ForegroundColor Gray
Write-Host "    -v `"`${PWD}/prisma:/app/prisma:ro`" \" -ForegroundColor Gray
Write-Host "    -w /app \" -ForegroundColor Gray
Write-Host "    ai-hub-be-api-gateway:latest \" -ForegroundColor Gray
Write-Host "    sh -c `"npx prisma migrate deploy`"" -ForegroundColor Gray

