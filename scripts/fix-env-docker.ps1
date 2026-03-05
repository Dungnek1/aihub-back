# Script to fix .env.docker - update RabbitMQ credentials to match code

if (-not (Test-Path .env.docker)) {
    Write-Host "Error: .env.docker file not found!" -ForegroundColor Red
    exit 1
}

Write-Host "Fixing .env.docker file..." -ForegroundColor Cyan

# Read .env.docker
$content = Get-Content .env.docker -Raw

# Replace RabbitMQ credentials from guest/guest to admin/admin123
$content = $content -replace 'RABBITMQ_DEFAULT_USER=guest', 'RABBITMQ_DEFAULT_USER=admin'
$content = $content -replace 'RABBITMQ_DEFAULT_PASS=guest', 'RABBITMQ_DEFAULT_PASS=admin123'

# Write back
$content | Out-File -FilePath .env.docker -Encoding utf8 -NoNewline

Write-Host "✅ Fixed .env.docker file" -ForegroundColor Green
Write-Host "⚠️  You need to restart RabbitMQ container for changes to take effect:" -ForegroundColor Yellow
Write-Host "   docker-compose -f docker-compose.dev.yml restart rabbitmq" -ForegroundColor Cyan

