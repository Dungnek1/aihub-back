# Script to fix DATABASE_URL_LOCAL in .env.dev to use postgres/postgres

if (-not (Test-Path .env.dev)) {
    Write-Host "Error: .env.dev file not found!" -ForegroundColor Red
    exit 1
}

Write-Host "Fixing DATABASE_URL_LOCAL in .env.dev..." -ForegroundColor Cyan

# Read .env.dev
$lines = Get-Content .env.dev
$fixedLines = @()
$foundLocalhost = $false

foreach ($line in $lines) {
    if ($line -match '^DATABASE_URL_LOCAL=') {
        # Keep only the localhost one and update to use postgres/postgres
        if ($line -match 'localhost') {
            $fixedLines += 'DATABASE_URL_LOCAL=postgresql://postgres:postgres@localhost:5432/ai_hub_db?schema=public'
            $foundLocalhost = $true
        }
        # Skip the postgres hostname one (for Docker internal)
    } else {
        $fixedLines += $line
    }
}

# If no localhost DATABASE_URL_LOCAL found, add one
if (-not $foundLocalhost) {
    $fixedLines = @('DATABASE_URL_LOCAL=postgresql://postgres:postgres@localhost:5432/ai_hub_db?schema=public') + $fixedLines
    Write-Host "Added DATABASE_URL_LOCAL" -ForegroundColor Yellow
}

# Write back
$fixedLines | Out-File -FilePath .env.dev -Encoding utf8

Write-Host "✅ Fixed DATABASE_URL_LOCAL in .env.dev" -ForegroundColor Green
Write-Host "   Using: postgresql://postgres:postgres@localhost:5432/ai_hub_db" -ForegroundColor Cyan

