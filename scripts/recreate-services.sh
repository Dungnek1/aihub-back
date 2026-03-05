#!/bin/bash
# Recreate all application services without affecting infrastructure services

echo "🔄 Recreating application services..."

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

# Stop and remove containers
echo "⏹️  Stopping services..."
docker compose stop "${SERVICES[@]}"

echo "🗑️  Removing containers..."
docker compose rm -f "${SERVICES[@]}"

# Rebuild and start services
echo "🔨 Rebuilding and starting services..."
docker compose up -d --build --force-recreate --no-deps "${SERVICES[@]}"

echo "✅ Services recreated successfully!"
echo ""
echo "📊 Service status:"
docker compose ps "${SERVICES[@]}"

