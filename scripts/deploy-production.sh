#!/bin/bash
# Production Deployment Script with Automatic Pre-checks and Rollback
# Fully automatic deployment - no manual intervention required
# IMPORTANT: Volumes are preserved - images will not be lost

set -e

echo "Starting production deployment with automatic safety checks and rollback..."
echo ""

# Step 0: Pull latest code from production_fix branch
echo "Step 0: Pulling latest code from production_fix branch..."
BRANCH="production_fix"

# Check if git is available
if ! command -v git &> /dev/null; then
  echo "❌ Error: git is not installed!"
  exit 1
fi

# Check if we're in a git repository
if [ ! -d ".git" ]; then
  echo "⚠ Warning: Not a git repository, skipping code pull"
else
  # Get current branch
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
  
  # Check if we need to switch branch
  if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
    echo "  - Current branch: $CURRENT_BRANCH"
    echo "  - Switching to branch: $BRANCH"
    git fetch origin "$BRANCH" || {
      echo "❌ Error: Failed to fetch branch $BRANCH"
      exit 1
    }
    git checkout "$BRANCH" || {
      echo "❌ Error: Failed to checkout branch $BRANCH"
      exit 1
    }
  fi
  
  # Stash any local changes
  if ! git diff-index --quiet HEAD --; then
    echo "  - Stashing local changes..."
    git stash push -m "Auto-stash before deploy $(date +%Y%m%d_%H%M%S)" || {
      echo "❌ Error: Failed to stash local changes"
      exit 1
    }
  fi
  
  # Pull latest code
  echo "  - Pulling latest code from origin/$BRANCH..."
  git fetch origin "$BRANCH" || {
    echo "❌ Error: Failed to fetch from origin"
    exit 1
  }
  
  # Check for conflicts before merging
  LOCAL=$(git rev-parse @)
  REMOTE=$(git rev-parse "origin/$BRANCH")
  BASE=$(git merge-base @ "origin/$BRANCH")
  
  if [ "$LOCAL" = "$REMOTE" ]; then
    echo "  ✓ Already up to date"
  elif [ "$LOCAL" = "$BASE" ]; then
    # Fast-forward possible
    echo "  - Fast-forward merge possible, pulling..."
    git pull origin "$BRANCH" || {
      echo "❌ Error: Failed to pull from origin/$BRANCH"
      exit 1
    }
    echo "  ✓ Code updated successfully"
  elif [ "$REMOTE" = "$BASE" ]; then
    # Local is ahead, no need to pull
    echo "  ✓ Local branch is ahead of remote"
  else
    # Divergent branches - check for conflicts
    echo "  - Checking for merge conflicts..."
    git merge --no-commit --no-ff "origin/$BRANCH" 2>&1
    MERGE_STATUS=$?
    
    if [ $MERGE_STATUS -ne 0 ]; then
      # Check if there are actual conflicts
      if git diff --check --conflict=diff3 || git ls-files -u | grep -q .; then
        echo "❌ Error: Merge conflicts detected!"
        echo ""
        echo "Conflicted files:"
        git diff --name-only --diff-filter=U
        echo ""
        echo "Please resolve conflicts manually and try again."
        git merge --abort 2>/dev/null || true
        exit 1
      else
        # Merge failed but no conflicts (might be other issues)
        git merge --abort 2>/dev/null || true
        echo "❌ Error: Merge failed. Please check the error above."
        exit 1
      fi
    else
      # No conflicts, complete the merge
      git merge --abort 2>/dev/null || true
      git pull origin "$BRANCH" || {
        echo "❌ Error: Failed to pull from origin/$BRANCH"
        exit 1
      }
      echo "  ✓ Code updated successfully"
    fi
  fi
  
  # Show latest commit
  echo ""
  echo "  Latest commit:"
  git log -1 --oneline
  echo ""
fi

# List of application services to recreate
SERVICES=(
  "api-gateway"
  "auth-service"
  "admin-service"
  "blog-service"
  "media-service"
  "notification-service"
  "tool-service"
  "support-service"
  "tool-marketing-service"
  "course-service"
)

# Function to rollback
rollback() {
  echo ""
  echo "❌ Deployment failed! Rolling back..."
  echo ""
  
  # Stop new containers
  docker compose stop "${SERVICES[@]}" || true
  
  # Remove new containers
  docker compose rm -f "${SERVICES[@]}" || true
  
  # Restore old images (if backup exists)
  for service in "${SERVICES[@]}"; do
    if docker images | grep -q "${service}:backup"; then
      echo "Restoring ${service} from backup..."
      docker tag "${service}:backup" "ai-hub-be-${service}:latest" || true
    fi
  done
  
  # Start old containers
  docker compose up -d --no-deps "${SERVICES[@]}" || true
  
  echo ""
  echo "Rollback completed. Services should be running with previous version."
  exit 1
}

# Trap errors and rollback
trap rollback ERR

# Step 1: Check and start infrastructure services if needed
echo "Step 1: Checking infrastructure services..."
INFRA_SERVICES=("postgres" "rabbitmq" "redis")
infra_missing=()

for service in "${INFRA_SERVICES[@]}"; do
  container_name="aihub_${service}"
  if ! docker ps -a --format '{{.Names}}' | grep -q "^${container_name}$"; then
    infra_missing+=("${service}")
  fi
done

if [ ${#infra_missing[@]} -gt 0 ]; then
  echo "  ⚠ Missing infrastructure services: ${infra_missing[*]}"
  echo "  - Starting missing infrastructure services..."
  docker compose up -d "${infra_missing[@]}" || true
  echo "  - Waiting for infrastructure services to be ready (15 seconds)..."
  sleep 15
  echo "  ✓ Infrastructure services started"
else
  echo "  ✓ All infrastructure services are running"
fi

# Verify volumes exist (to ensure images are safe)
echo ""
echo "Verifying volumes..."
if docker volume ls | grep -q "ai-hub-be_uploaded_files"; then
  echo "✓ uploaded_files volume exists - images are safe"
else
  echo "⚠ Warning: uploaded_files volume not found"
fi

# Step 2: Pre-deployment checks
echo ""
echo "Step 2: Pre-deployment checks..."

# Check if docker compose file exists
if [ ! -f "docker-compose.yml" ]; then
  echo "❌ Error: docker-compose.yml not found!"
  exit 1
fi

# Validate docker-compose.yml syntax
echo "  - Validating docker-compose.yml..."
docker compose config > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "❌ Error: docker-compose.yml has syntax errors!"
  docker compose config
  exit 1
fi
echo "  ✓ docker-compose.yml is valid"

# Check if .env file exists
if [ ! -f ".env" ]; then
  echo "❌ Error: .env file not found!"
  exit 1
fi
echo "  ✓ .env file exists"

# Validate migration prerequisites
echo "  - Validating migration prerequisites..."
# Load database credentials from .env file
if [ -f ".env" ]; then
  export $(grep -E '^POSTGRES_USER=|^POSTGRES_PASSWORD=|^POSTGRES_DB=' .env | xargs)
fi

POSTGRES_USER=${POSTGRES_USER:-postgres}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres}
POSTGRES_DB=${POSTGRES_DB:-ai_hub_db}
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}"

# Check if prisma folder exists
if [ ! -d "prisma" ]; then
  echo "❌ Error: prisma folder not found!"
  exit 1
fi
echo "  ✓ prisma folder exists"

# Check if schema.prisma exists
if [ ! -f "prisma/schema.prisma" ]; then
  echo "❌ Error: prisma/schema.prisma not found!"
  exit 1
fi
echo "  ✓ prisma/schema.prisma exists"

# Validate Prisma schema file format (basic check)
echo "  - Validating Prisma schema format..."
if grep -q "datasource db" prisma/schema.prisma && grep -q "generator client" prisma/schema.prisma; then
  echo "  ✓ Prisma schema format is valid"
else
  echo "❌ Error: Prisma schema format is invalid!"
  exit 1
fi

# Check if migrations folder exists
if [ ! -d "prisma/migrations" ]; then
  echo "  ⚠ Warning: prisma/migrations folder not found (no migrations to run)"
else
  echo "  ✓ prisma/migrations folder exists"
fi

# Step 3: Backup current images
echo ""
echo "Step 2: Backing up current images..."
for service in "${SERVICES[@]}"; do
  image_name="ai-hub-be-${service}"
  if docker images | grep -q "${image_name}:latest"; then
    echo "  - Backing up ${image_name}..."
    docker tag "${image_name}:latest" "${image_name}:backup" || true
  fi
done
echo "✓ Backup completed"

# Step 4: Stop services
echo ""
echo "Step 3: Stopping services..."
docker compose stop "${SERVICES[@]}" || true

# Step 5: Remove containers (volumes are NOT removed)
echo "Step 4: Removing containers (volumes preserved)..."
docker compose rm -f "${SERVICES[@]}" || true

# Step 6: Build images (no cache to ensure latest code)
echo ""
echo "Step 5: Building images with latest code (no cache)..."
if ! docker compose build --no-cache "${SERVICES[@]}"; then
  echo "❌ Error: Build failed! Check the errors above."
  rollback
fi
echo "✓ Build completed successfully"


# Step 6: Recreate and start services
echo ""
echo "Step 6: Recreating and starting services..."
if ! docker compose up -d --force-recreate --no-deps "${SERVICES[@]}"; then
  echo "❌ Error: Failed to start services!"
  rollback
fi

# Step 7: Health check (wait a bit and check if services are running)
echo ""
echo "Step 7: Health check (waiting 10 seconds)..."
sleep 10

failed_services=()
for service in "${SERVICES[@]}"; do
  container_name="aihub_${service//-/_}"
  if ! docker ps | grep -q "${container_name}"; then
    failed_services+=("${service}")
  fi
done

if [ ${#failed_services[@]} -gt 0 ]; then
  echo "❌ Error: The following services failed to start:"
  printf '  - %s\n' "${failed_services[@]}"
  echo ""
  echo "Checking logs..."
  for service in "${failed_services[@]}"; do
    echo "--- Logs for ${service} ---"
    docker compose logs --tail=50 "${service}" || true
  done
  rollback
fi

# Success - keep backup images for safety (auto cleanup after 24h or next successful deploy)
echo ""
echo "✓ All services started successfully!"
echo ""
echo "Step 8: Deployment verification..."
sleep 5

# Final verification - check if services are still running
final_failed=()
for service in "${SERVICES[@]}"; do
  container_name="aihub_${service//-/_}"
  if ! docker ps | grep -q "${container_name}"; then
    final_failed+=("${service}")
  fi
done

if [ ${#final_failed[@]} -gt 0 ]; then
  echo "❌ Error: Services failed after start:"
  printf '  - %s\n' "${final_failed[@]}"
  rollback
fi

# Disable trap on success
trap - ERR

echo "✓ All services verified and running"
echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "Service status:"
docker compose ps "${SERVICES[@]}"
echo ""
echo "Backup images kept for automatic rollback if needed"
echo "To view logs:"
echo "   docker compose logs -f [service-name]"
