# Recreate all application services without affecting infrastructure services

Write-Host "🔄 Recreating application services..." -ForegroundColor Cyan

# List of application services to recreate
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

# Stop and remove containers
Write-Host "⏹️  Stopping services..." -ForegroundColor Yellow
docker compose stop $services

Write-Host "🗑️  Removing containers..." -ForegroundColor Yellow
docker compose rm -f $services

# Rebuild and start services
Write-Host "🔨 Rebuilding and starting services..." -ForegroundColor Green
docker compose up -d --build --force-recreate --no-deps $services

Write-Host "✅ Services recreated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Service status:" -ForegroundColor Cyan
docker compose ps $services

