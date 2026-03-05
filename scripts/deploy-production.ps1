# Production Deployment Script with Automatic Pre-checks and Rollback
# Fully automatic deployment - no manual intervention required
# IMPORTANT: Volumes are preserved - images will not be lost

$ErrorActionPreference = "Stop"

Write-Host "Starting production deployment with automatic safety checks and rollback..." -ForegroundColor Cyan
Write-Host ""

# Step 0: Pull latest code from production_fix branch
Write-Host "Step 0: Pulling latest code from production_fix branch..." -ForegroundColor Cyan
$branch = "production_fix"

# Check if git is available
try {
    $null = git --version
} catch {
    Write-Host "Error: git is not installed!" -ForegroundColor Red
    exit 1
}

# Check if we're in a git repository
if (-not (Test-Path ".git")) {
    Write-Host "⚠ Warning: Not a git repository, skipping code pull" -ForegroundColor Yellow
} else {
    # Get current branch
    $currentBranch = git rev-parse --abbrev-ref HEAD 2>$null
    if (-not $currentBranch) {
        $currentBranch = ""
    }
    
    # Check if we need to switch branch
    if ($currentBranch -ne $branch) {
        Write-Host "  - Current branch: $currentBranch" -ForegroundColor Gray
        Write-Host "  - Switching to branch: $branch" -ForegroundColor Cyan
        git fetch origin $branch
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Error: Failed to fetch branch $branch" -ForegroundColor Red
            exit 1
        }
        git checkout $branch
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Error: Failed to checkout branch $branch" -ForegroundColor Red
            exit 1
        }
    }
    
    # Stash any local changes
    $hasChanges = git diff-index --quiet HEAD --
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  - Stashing local changes..." -ForegroundColor Cyan
        $stashMessage = "Auto-stash before deploy $(Get-Date -Format 'yyyyMMdd_HHmmss')"
        git stash push -m $stashMessage
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Error: Failed to stash local changes" -ForegroundColor Red
            exit 1
        }
    }
    
    # Pull latest code
    Write-Host "  - Pulling latest code from origin/$branch..." -ForegroundColor Cyan
    git fetch origin $branch
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to fetch from origin" -ForegroundColor Red
        exit 1
    }
    
    # Check for conflicts before merging
    $local = git rev-parse @
    $remote = git rev-parse "origin/$branch"
    $base = git merge-base @ "origin/$branch"
    
    if ($local -eq $remote) {
        Write-Host "  ✓ Already up to date" -ForegroundColor Green
    } elseif ($local -eq $base) {
        # Fast-forward possible
        Write-Host "  - Fast-forward merge possible, pulling..." -ForegroundColor Cyan
        git pull origin $branch
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Error: Failed to pull from origin/$branch" -ForegroundColor Red
            exit 1
        }
        Write-Host "  ✓ Code updated successfully" -ForegroundColor Green
    } elseif ($remote -eq $base) {
        # Local is ahead, no need to pull
        Write-Host "  ✓ Local branch is ahead of remote" -ForegroundColor Green
    } else {
        # Divergent branches - check for conflicts
        Write-Host "  - Checking for merge conflicts..." -ForegroundColor Cyan
        git merge --no-commit --no-ff "origin/$branch" 2>&1 | Out-Null
        $mergeStatus = $LASTEXITCODE
        
        if ($mergeStatus -ne 0) {
            # Check if there are actual conflicts
            $conflictedFiles = git diff --name-only --diff-filter=U
            if ($conflictedFiles) {
                Write-Host "Error: Merge conflicts detected!" -ForegroundColor Red
                Write-Host ""
                Write-Host "Conflicted files:" -ForegroundColor Red
                $conflictedFiles | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
                Write-Host ""
                Write-Host "Please resolve conflicts manually and try again." -ForegroundColor Red
                git merge --abort 2>$null
                exit 1
            } else {
                # Merge failed but no conflicts (might be other issues)
                git merge --abort 2>$null
                Write-Host "Error: Merge failed. Please check the error above." -ForegroundColor Red
                exit 1
            }
        } else {
            # No conflicts, complete the merge
            git merge --abort 2>$null
            git pull origin $branch
            if ($LASTEXITCODE -ne 0) {
                Write-Host "Error: Failed to pull from origin/$branch" -ForegroundColor Red
                exit 1
            }
            Write-Host "  ✓ Code updated successfully" -ForegroundColor Green
        }
    }
    
    # Show latest commit
    Write-Host ""
    Write-Host "  Latest commit:" -ForegroundColor Cyan
    git log -1 --oneline
    Write-Host ""
}

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

# Function to rollback (fully automatic)
function Rollback {
    Write-Host ""
    Write-Host "Deployment failed! Automatically rolling back..." -ForegroundColor Red
    Write-Host ""
    
    # Stop new containers
    Write-Host "  - Stopping failed containers..." -ForegroundColor Yellow
    docker compose stop $services 2>$null
    
    # Remove new containers
    Write-Host "  - Removing failed containers..." -ForegroundColor Yellow
    docker compose rm -f $services 2>$null
    
    # Restore old images (if backup exists)
    Write-Host "  - Restoring previous images..." -ForegroundColor Yellow
    $restoredCount = 0
    foreach ($service in $services) {
        $imageName = "ai-hub-be-${service}"
        $backupExists = docker images --format "{{.Repository}}:{{.Tag}}" | Select-String "${imageName}:backup"
        if ($backupExists) {
            Write-Host "    → Restoring ${imageName}..." -ForegroundColor Gray
            docker tag "${imageName}:backup" "${imageName}:latest" 2>$null
            $restoredCount++
        }
    }
    
    if ($restoredCount -eq 0) {
        Write-Host "  ⚠ No backup images found. Cannot rollback automatically." -ForegroundColor Red
        Write-Host "  Please check git history or restore from manual backup." -ForegroundColor Red
        exit 1
    }
    
    # Start old containers
    Write-Host "  - Starting previous version..." -ForegroundColor Yellow
    docker compose up -d --force-recreate --no-deps $services 2>$null
    
    # Wait and verify rollback
    Write-Host "  - Verifying rollback..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    $rollbackFailed = @()
    foreach ($service in $services) {
        $containerName = "aihub_$($service -replace '-', '_')"
        $isRunning = docker ps | Select-String $containerName
        if (-not $isRunning) {
            $rollbackFailed += $service
        }
    }
    
    Write-Host ""
    if ($rollbackFailed.Count -eq 0) {
        Write-Host "✅ Rollback completed successfully!" -ForegroundColor Green
        Write-Host "Services are running with previous version." -ForegroundColor Green
    } else {
        Write-Host "⚠ Rollback partially failed. The following services need manual attention:" -ForegroundColor Yellow
        foreach ($service in $rollbackFailed) {
            Write-Host "  - $service" -ForegroundColor Yellow
        }
        Write-Host ""
        Write-Host "Please check logs: docker compose logs [service-name]" -ForegroundColor Cyan
    }
    
    exit 1
}

try {
    # Step 1: Check and start infrastructure services if needed
    Write-Host "Step 1: Checking infrastructure services..." -ForegroundColor Cyan
    $infraServices = @("postgres", "rabbitmq", "redis")
    $infraMissing = @()
    
    foreach ($service in $infraServices) {
        $containerName = "aihub_$($service -replace '-', '_')"
        $exists = docker ps -a --format '{{.Names}}' | Select-String "^${containerName}$"
        if (-not $exists) {
            $infraMissing += $service
        }
    }
    
    if ($infraMissing.Count -gt 0) {
        Write-Host "  ⚠ Missing infrastructure services: $($infraMissing -join ', ')" -ForegroundColor Yellow
        Write-Host "  - Starting missing infrastructure services..." -ForegroundColor Cyan
        docker compose up -d $infraMissing | Out-Null
        Write-Host "  - Waiting for infrastructure services to be ready (15 seconds)..." -ForegroundColor Cyan
        Start-Sleep -Seconds 15
        Write-Host "  ✓ Infrastructure services started" -ForegroundColor Green
    } else {
        Write-Host "  ✓ All infrastructure services are running" -ForegroundColor Green
    }
    
    # Verify volumes exist (to ensure images are safe)
    Write-Host ""
    Write-Host "Verifying volumes..." -ForegroundColor Cyan
    $volumeExists = docker volume ls | Select-String "ai-hub-be_uploaded_files"
    if ($volumeExists) {
        Write-Host "✓ uploaded_files volume exists - images are safe" -ForegroundColor Green
    } else {
        Write-Host "⚠ Warning: uploaded_files volume not found" -ForegroundColor Yellow
    }

    # Step 2: Pre-deployment checks
    Write-Host ""
    Write-Host "Step 2: Pre-deployment checks..." -ForegroundColor Cyan
    
    # Check if docker compose file exists
    if (-not (Test-Path "docker-compose.yml")) {
        Write-Host "Error: docker-compose.yml not found!" -ForegroundColor Red
        exit 1
    }
    
    # Validate docker-compose.yml syntax
    Write-Host "  - Validating docker-compose.yml..." -ForegroundColor Gray
    docker compose config | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: docker-compose.yml has syntax errors!" -ForegroundColor Red
        docker compose config
        exit 1
    }
    Write-Host "  ✓ docker-compose.yml is valid" -ForegroundColor Green
    
    # Check if .env file exists
    if (-not (Test-Path ".env")) {
        Write-Host "Error: .env file not found!" -ForegroundColor Red
        exit 1
    }
    Write-Host "  ✓ .env file exists" -ForegroundColor Green

    # Validate migration prerequisites
    Write-Host "  - Validating migration prerequisites..." -ForegroundColor Cyan
    
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

    # Check if prisma folder exists
    if (-not (Test-Path "prisma")) {
        Write-Host "Error: prisma folder not found!" -ForegroundColor Red
        exit 1
    }
    Write-Host "  ✓ prisma folder exists" -ForegroundColor Green

    # Check if schema.prisma exists
    if (-not (Test-Path "prisma/schema.prisma")) {
        Write-Host "Error: prisma/schema.prisma not found!" -ForegroundColor Red
        exit 1
    }
    Write-Host "  ✓ prisma/schema.prisma exists" -ForegroundColor Green

    # Validate Prisma schema file format (basic check)
    Write-Host "  - Validating Prisma schema format..." -ForegroundColor Cyan
    $schemaContent = Get-Content "prisma/schema.prisma" -Raw
    if ($schemaContent -match "datasource db" -and $schemaContent -match "generator client") {
        Write-Host "  ✓ Prisma schema format is valid" -ForegroundColor Green
    } else {
        Write-Host "Error: Prisma schema format is invalid!" -ForegroundColor Red
        exit 1
    }

    # Check if migrations folder exists
    if (-not (Test-Path "prisma/migrations")) {
        Write-Host "  ⚠ Warning: prisma/migrations folder not found (no migrations to run)" -ForegroundColor Yellow
    } else {
        Write-Host "  ✓ prisma/migrations folder exists" -ForegroundColor Green
    }

    # Step 3: Backup current images
    Write-Host ""
    Write-Host "Step 2: Backing up current images..." -ForegroundColor Cyan
    foreach ($service in $services) {
        $imageName = "ai-hub-be-${service}"
        $imageExists = docker images | Select-String "${imageName}:latest"
        if ($imageExists) {
            Write-Host "  - Backing up ${imageName}..." -ForegroundColor Gray
            docker tag "${imageName}:latest" "${imageName}:backup"
        }
    }
    Write-Host "✓ Backup completed" -ForegroundColor Green

    # Step 4: Stop services
    Write-Host ""
    Write-Host "Step 3: Stopping services..." -ForegroundColor Yellow
    docker compose stop $services

    # Step 5: Remove containers (volumes are NOT removed)
    Write-Host "Step 4: Removing containers (volumes preserved)..." -ForegroundColor Yellow
    docker compose rm -f $services

    # Step 6: Build images (no cache to ensure latest code)
    Write-Host ""
    Write-Host "Step 5: Building images with latest code (no cache)..." -ForegroundColor Green
    docker compose build --no-cache $services
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Build failed! Check the errors above." -ForegroundColor Red
        Rollback
    }
    Write-Host "✓ Build completed successfully" -ForegroundColor Green

    # Step 6: Recreate and start services
    Write-Host ""
    Write-Host "Step 6: Recreating and starting services..." -ForegroundColor Green
    docker compose up -d --force-recreate --no-deps $services
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to start services!" -ForegroundColor Red
        Rollback
    }

    # Step 7: Health check (wait a bit and check if services are running)
    Write-Host ""
    Write-Host "Step 7: Health check (waiting 10 seconds)..." -ForegroundColor Cyan
    Start-Sleep -Seconds 10

    $failedServices = @()
    foreach ($service in $services) {
        $containerName = "aihub_$($service -replace '-', '_')"
        $isRunning = docker ps | Select-String $containerName
        if (-not $isRunning) {
            $failedServices += $service
        }
    }

    if ($failedServices.Count -gt 0) {
        Write-Host "Error: The following services failed to start:" -ForegroundColor Red
        foreach ($service in $failedServices) {
            Write-Host "  - $service" -ForegroundColor Red
        }
        Write-Host ""
        Write-Host "Checking logs..." -ForegroundColor Yellow
        foreach ($service in $failedServices) {
            Write-Host "--- Logs for $service ---" -ForegroundColor Gray
            docker compose logs --tail=50 $service
        }
        Rollback
    }

    # Success - keep backup images for safety
    Write-Host ""
    Write-Host "✓ All services started successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Step 8: Deployment verification..." -ForegroundColor Cyan
    Start-Sleep -Seconds 5

    # Final verification - check if services are still running
    $finalFailed = @()
    foreach ($service in $services) {
        $containerName = "aihub_$($service -replace '-', '_')"
        $isRunning = docker ps | Select-String $containerName
        if (-not $isRunning) {
            $finalFailed += $service
        }
    }

    if ($finalFailed.Count -gt 0) {
        Write-Host "Error: Services failed after start:" -ForegroundColor Red
        foreach ($service in $finalFailed) {
            Write-Host "  - $service" -ForegroundColor Red
        }
        Rollback
    }

    Write-Host "✓ All services verified and running" -ForegroundColor Green
    Write-Host ""
    Write-Host "Deployment completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Service status:" -ForegroundColor Cyan
    docker compose ps $services
    Write-Host ""
    Write-Host "Backup images kept for automatic rollback if needed" -ForegroundColor Yellow
    Write-Host "To view logs:" -ForegroundColor Cyan
    Write-Host "   docker compose logs -f [service-name]" -ForegroundColor Gray

} catch {
    Write-Host ""
    Write-Host "Deployment failed with error: $_" -ForegroundColor Red
    Rollback
}
