# Restart Infrastructure Services
# Restarts postgres, pgadmin, rabbitmq, redis, redis-commander if needed

$ErrorActionPreference = "Stop"

Write-Host "Restarting infrastructure services..." -ForegroundColor Cyan
Write-Host ""

# List of infrastructure services
$infraServices = @(
    "postgres",
    "pgadmin",
    "rabbitmq",
    "redis",
    "redis-commander"
)

# Step 1: Stop services
Write-Host "Step 1: Stopping infrastructure services..." -ForegroundColor Yellow
docker compose stop $infraServices

# Step 2: Start services
Write-Host ""
Write-Host "Step 2: Starting infrastructure services..." -ForegroundColor Green
docker compose up -d $infraServices

# Step 3: Wait for services to be healthy
Write-Host ""
Write-Host "Step 3: Waiting for services to be healthy (30 seconds)..." -ForegroundColor Cyan
Start-Sleep -Seconds 30

# Step 4: Verify services are running
Write-Host ""
Write-Host "Step 4: Verifying services..." -ForegroundColor Cyan
$failedServices = @()
foreach ($service in $infraServices) {
    $containerName = "aihub_$($service -replace '-', '_')"
    $isRunning = docker ps | Select-String $containerName
    if (-not $isRunning) {
        $failedServices += $service
    }
}

if ($failedServices.Count -gt 0) {
    Write-Host "⚠ Warning: The following services may not be running:" -ForegroundColor Yellow
    foreach ($service in $failedServices) {
        Write-Host "  - $service" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "Checking logs..." -ForegroundColor Yellow
    foreach ($service in $failedServices) {
        Write-Host "--- Logs for $service ---" -ForegroundColor Gray
        docker compose logs --tail=50 $service
    }
} else {
    Write-Host "✓ All infrastructure services are running" -ForegroundColor Green
}

Write-Host ""
Write-Host "Infrastructure services status:" -ForegroundColor Cyan
docker compose ps $infraServices
Write-Host ""
Write-Host "To view logs:" -ForegroundColor Cyan
Write-Host "   docker compose logs -f [service-name]" -ForegroundColor Gray

