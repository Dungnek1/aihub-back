#!/bin/bash
# Rollback Script - Restore previous version of services

set -e

echo "Starting rollback to previous version..."
echo ""

# List of application services
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

# Step 1: Stop current services
echo "Step 1: Stopping current services..."
docker compose stop "${SERVICES[@]}" || true

# Step 2: Remove current containers
echo "Step 2: Removing current containers..."
docker compose rm -f "${SERVICES[@]}" || true

# Step 3: Restore backup images
echo "Step 3: Restoring backup images..."
restored=0
for service in "${SERVICES[@]}"; do
  image_name="ai-hub-be-${service}"
  if docker images | grep -q "${image_name}:backup"; then
    echo "  - Restoring ${image_name}..."
    docker tag "${image_name}:backup" "${image_name}:latest" || true
    restored=$((restored + 1))
  else
    echo "  ⚠ No backup found for ${image_name}"
  fi
done

if [ $restored -eq 0 ]; then
  echo ""
  echo "❌ No backup images found! Cannot rollback."
  echo "You may need to rebuild from previous git commit."
  exit 1
fi

# Step 4: Start services with old images
echo ""
echo "Step 4: Starting services with previous version..."
docker compose up -d --force-recreate --no-deps "${SERVICES[@]}"

echo ""
echo "✅ Rollback completed!"
echo ""
echo "Service status:"
docker compose ps "${SERVICES[@]}"

