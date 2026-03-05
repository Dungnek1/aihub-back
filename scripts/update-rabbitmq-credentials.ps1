# Script to update RabbitMQ credentials in .env.dev to use guest/guest

if (-not (Test-Path .env.dev)) {
    Write-Host "Error: .env.dev file not found!" -ForegroundColor Red
    exit 1
}

Write-Host "Updating RabbitMQ credentials in .env.dev to use guest/guest..." -ForegroundColor Cyan

# Read .env.dev
$content = Get-Content .env.dev -Raw

# Update RABBITMQ_URL to use guest/guest
$content = $content -replace 'RABBITMQ_URL=amqp://[^@]+@localhost:5672', 'RABBITMQ_URL=amqp://guest:guest@localhost:5672'
$content = $content -replace 'RABBITMQ_URL_LOCAL=amqp://[^@]+@localhost:5672', 'RABBITMQ_URL_LOCAL=amqp://guest:guest@localhost:5672'

# Update RABBITMQ_DEFAULT_USER and RABBITMQ_DEFAULT_PASS if they exist
$content = $content -replace 'RABBITMQ_DEFAULT_USER=admin', 'RABBITMQ_DEFAULT_USER=guest'
$content = $content -replace 'RABBITMQ_DEFAULT_PASS=admin123', 'RABBITMQ_DEFAULT_PASS=guest'

# Write back
$content | Out-File -FilePath .env.dev -Encoding utf8 -NoNewline

Write-Host "✅ Updated .env.dev to use guest/guest for RabbitMQ" -ForegroundColor Green

