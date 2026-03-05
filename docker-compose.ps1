# Docker Compose Wrapper Script
# Auto select docker-compose file and env file based on environment

param(
    [Parameter(Position=0)]
    [string]$Command = "up",
    
    [Parameter(Position=1, ValueFromRemainingArguments=$true)]
    [string[]]$Args
)

# Determine environment
$envType = "dev"
if ($env:DOCKER_ENV) {
    $envType = $env:DOCKER_ENV
} elseif ($env:NODE_ENV -eq "production") {
    $envType = "production"
}

# Select docker-compose file and env file
$composeFile = "docker-compose.dev.yml"
$envFile = ".env.dev"

if ($envType -eq "production") {
    $composeFile = "docker-compose.yml"
    $envFile = ".env"
    Write-Host "Using PRODUCTION configuration" -ForegroundColor Green
} else {
    Write-Host "Using DEV/LOCAL configuration" -ForegroundColor Yellow
}

Write-Host "Compose file: $composeFile" -ForegroundColor Cyan
Write-Host "Env file: $envFile" -ForegroundColor Cyan

# Copy env file to .env for docker-compose to auto-load
# Only copy if source and destination are different
if (Test-Path $envFile) {
    # If envFile is already .env, skip copying
    if ($envFile -eq ".env") {
        Write-Host "✅ Using existing .env file" -ForegroundColor Green
    } else {
        Copy-Item $envFile .env -Force
        Write-Host "✅ Loaded environment from $envFile" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  Warning: $envFile not found!" -ForegroundColor Red
}

# Run docker-compose with selected file
$composeArgs = @("-f", $composeFile) + $Args

if ($Command -ne "") {
    $composeArgs += $Command
}

Write-Host ""
Write-Host "Running: docker-compose $($composeArgs -join ' ')" -ForegroundColor Cyan
Write-Host ""

& docker-compose $composeArgs
