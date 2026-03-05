# Manual Rollback Script
# Restores application services to the last backed-up images

$ErrorActionPreference = "Stop"

Write-Host "Starting manual rollback..." -ForegroundColor Cyan
Write-Host ""

$services = @(
    "api-gateway",
    "auth-service",
    "admin-service",
    "blog-service",
    "media-service",
    "notification-service",
    "tool-service",
    "support-service",
    "tool-marketing-service",
    "course-service"
)

Write-Host "Stopping current services..." -ForegroundColor Yellow
docker compose stop $services | Out-Null

Write-Host "Removing current containers..." -ForegroundColor Yellow
docker compose rm -f $services | Out-Null

Write-Host "Restoring images from backup..." -ForegroundColor Yellow
foreach ($service in $services) {
    $imageName = "ai-hub-be-$service"
    $backupImage = (docker images --format "{{.Repository}}:{{.Tag}}" | Select-String "$imageName`:backup")
    if ($backupImage) {
        Write-Host "  - Restoring $imageName from backup..." -ForegroundColor Yellow
        docker tag "$imageName`:backup" "$imageName`:latest" | Out-Null
    } else {
        Write-Host "  - No backup image found for $imageName. Skipping." -ForegroundColor Yellow
    }
}

Write-Host "Starting services with restored images..." -ForegroundColor Green
docker compose up -d --no-deps $services
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Rollback failed! Check logs for errors." -ForegroundColor Red
    exit 1
}

Write-Host "" -ForegroundColor Green
Write-Host "✅ Rollback completed successfully!" -ForegroundColor Green
Write-Host "" -ForegroundColor Cyan
Write-Host "Service status:" -ForegroundColor Cyan
docker compose ps $services

