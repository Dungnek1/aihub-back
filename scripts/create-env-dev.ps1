# Script to create .env.dev from .env
# This script copies .env to .env.dev and updates DATABASE_URL to DATABASE_URL_LOCAL

if (-not (Test-Path .env)) {
    Write-Host "Error: .env file not found!" -ForegroundColor Red
    exit 1
}

Write-Host "Creating .env.dev from .env..." -ForegroundColor Cyan

# Read .env file
$envContent = Get-Content .env -Raw

# Replace DATABASE_URL with DATABASE_URL_LOCAL (for local development)
# Also update RabbitMQ and Redis to use localhost
$envContent = $envContent -replace 'DATABASE_URL=', 'DATABASE_URL_LOCAL='
$envContent = $envContent -replace 'RABBITMQ_URL=amqp://[^@]+@rabbitmq:', 'RABBITMQ_URL=amqp://admin:admin123@localhost:'
$envContent = $envContent -replace 'RABBITMQ_HOST=rabbitmq', 'RABBITMQ_HOST=localhost'
$envContent = $envContent -replace 'REDIS_HOST=redis', 'REDIS_HOST=localhost'
# For local dev, Redis usually doesn't require password
$envContent = $envContent -replace 'REDIS_PASSWORD=[^\r\n]+', 'REDIS_PASSWORD='

# Update API Gateway URL for local
$envContent = $envContent -replace 'API_GATEWAY_BASE_URL=https://[^\s]+', 'API_GATEWAY_BASE_URL=http://localhost:9000'

# Write to .env.dev
$envContent | Out-File -FilePath .env.dev -Encoding utf8 -NoNewline

Write-Host "✅ Created .env.dev file" -ForegroundColor Green
Write-Host "⚠️  Please review and update .env.dev with your local database credentials" -ForegroundColor Yellow

