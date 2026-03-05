# Script to fix .env.dev - remove duplicate DATABASE_URL_LOCAL and keep only localhost one

if (-not (Test-Path .env.dev)) {
    Write-Host "Error: .env.dev file not found!" -ForegroundColor Red
    exit 1
}

Write-Host "Fixing .env.dev file..." -ForegroundColor Cyan

# Read all lines
$lines = Get-Content .env.dev

# Filter out DATABASE_URL_LOCAL with postgres host, keep only localhost one
$fixedLines = @()
$foundLocalhost = $false

foreach ($line in $lines) {
    if ($line -match '^DATABASE_URL_LOCAL=') {
        if ($line -match 'localhost') {
            $fixedLines += $line
            $foundLocalhost = $true
        }
        # Skip the postgres one
    } else {
        $fixedLines += $line
    }
}

# If no localhost DATABASE_URL_LOCAL found, add a default one
if (-not $foundLocalhost) {
    $fixedLines = @("DATABASE_URL_LOCAL=postgresql://postgres:postgres@localhost:5432/ai_hub_db") + $fixedLines
    Write-Host "Added default DATABASE_URL_LOCAL" -ForegroundColor Yellow
}

# Write back
$fixedLines | Out-File -FilePath .env.dev -Encoding utf8

Write-Host "✅ Fixed .env.dev file" -ForegroundColor Green

