#!/bin/bash
# Script to resolve failed Prisma migrations
# Usage: bash scripts/resolve-failed-migrations.sh [migration_name]

set -e

echo "Resolving failed Prisma migrations..."
echo ""

# Load database credentials from .env file
if [ -f ".env" ]; then
  export $(grep -E '^POSTGRES_USER=|^POSTGRES_PASSWORD=|^POSTGRES_DB=' .env | xargs)
fi

POSTGRES_USER=${POSTGRES_USER:-postgres}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres}
POSTGRES_DB=${POSTGRES_DB:-ai_hub_db}
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}"

# Check if migration name is provided as argument
if [ -n "$1" ]; then
  MIGRATION_NAME="$1"
  echo "Resolving migration: $MIGRATION_NAME"
else
  # Try to detect failed migration
  echo "Checking for failed migrations..."
  MIGRATION_OUTPUT=$(docker run --rm \
    --name "migration_check_$(date +%s)" \
    --network traefik-network \
    -e DATABASE_URL="${DATABASE_URL}" \
    -e DATABASE_URL_LOCAL="${DATABASE_URL}" \
    -v "$(pwd)/prisma:/app/prisma:ro" \
    -w /app \
    ai-hub-be-api-gateway:latest \
    sh -c "npx prisma migrate deploy 2>&1" || true)
  
  # Extract migration name from error
  MIGRATION_NAME=$(echo "$MIGRATION_OUTPUT" | grep -oE "`[0-9]{14}_[a-z_]+`" | tr -d '`' | head -1)
  
  if [ -z "$MIGRATION_NAME" ]; then
    # Try from migrate status
    MIGRATION_STATUS=$(docker run --rm \
      --name "migration_status_$(date +%s)" \
      --network traefik-network \
      -e DATABASE_URL="${DATABASE_URL}" \
      -e DATABASE_URL_LOCAL="${DATABASE_URL}" \
      -v "$(pwd)/prisma:/app/prisma:ro" \
      -w /app \
      ai-hub-be-api-gateway:latest \
      sh -c "npx prisma migrate status 2>&1" || true)
    
    MIGRATION_NAME=$(echo "$MIGRATION_STATUS" | grep -i "failed" | grep -oE "[0-9]{14}_[a-z_]+" | head -1)
  fi
  
  if [ -z "$MIGRATION_NAME" ]; then
    echo "❌ Error: Could not detect failed migration automatically"
    echo ""
    echo "Please provide migration name manually:"
    echo "  bash scripts/resolve-failed-migrations.sh <migration_name>"
    echo ""
    echo "Example:"
    echo "  bash scripts/resolve-failed-migrations.sh 20251117042444_add_support_contact_request"
    exit 1
  fi
  
  echo "Detected failed migration: $MIGRATION_NAME"
fi

echo ""
echo "Resolving migration: $MIGRATION_NAME"
echo ""

# Try to resolve as rolled-back first
echo "Attempt 1: Marking as rolled-back..."
RESOLVE_OUTPUT=$(docker run --rm \
  --name "migration_resolve_rolledback_$(date +%s)" \
  --network traefik-network \
  -e DATABASE_URL="${DATABASE_URL}" \
  -e DATABASE_URL_LOCAL="${DATABASE_URL}" \
  -v "$(pwd)/prisma:/app/prisma:ro" \
  -w /app \
  ai-hub-be-api-gateway:latest \
  sh -c "npx prisma migrate resolve --rolled-back $MIGRATION_NAME 2>&1" || echo "FAILED")

if echo "$RESOLVE_OUTPUT" | grep -qi "error\|failed"; then
  echo "  ❌ Rolled-back failed"
  echo ""
  echo "Attempt 2: Marking as applied..."
  
  # Try as applied
  RESOLVE_OUTPUT=$(docker run --rm \
    --name "migration_resolve_applied_$(date +%s)" \
    --network traefik-network \
    -e DATABASE_URL="${DATABASE_URL}" \
    -e DATABASE_URL_LOCAL="${DATABASE_URL}" \
    -v "$(pwd)/prisma:/app/prisma:ro" \
    -w /app \
    ai-hub-be-api-gateway:latest \
    sh -c "npx prisma migrate resolve --applied $MIGRATION_NAME 2>&1" || echo "FAILED")
  
  if echo "$RESOLVE_OUTPUT" | grep -qi "error\|failed"; then
    echo "  ❌ Applied also failed"
    echo ""
    echo "❌ Error: Could not resolve migration automatically"
    echo ""
    echo "Please resolve manually:"
    echo "  docker run --rm --network traefik-network \\"
    echo "    -e DATABASE_URL=\"${DATABASE_URL}\" \\"
    echo "    -e DATABASE_URL_LOCAL=\"${DATABASE_URL}\" \\"
    echo "    -v \"\$(pwd)/prisma:/app/prisma:ro\" \\"
    echo "    -w /app \\"
    echo "    ai-hub-be-api-gateway:latest \\"
    echo "    sh -c \"npx prisma migrate resolve --rolled-back $MIGRATION_NAME\""
    exit 1
  else
    echo "  ✓ Migration resolved as applied"
  fi
else
  echo "  ✓ Migration resolved as rolled-back"
fi

echo ""
echo "Verifying migration status..."
docker run --rm \
  --name "migration_verify_$(date +%s)" \
  --network traefik-network \
  -e DATABASE_URL="${DATABASE_URL}" \
  -e DATABASE_URL_LOCAL="${DATABASE_URL}" \
  -v "$(pwd)/prisma:/app/prisma:ro" \
  -w /app \
  ai-hub-be-api-gateway:latest \
  sh -c "npx prisma migrate status"

echo ""
echo "✅ Migration resolved successfully!"
echo ""
echo "You can now run migrations again:"
echo "  npm run deploy:prod"
echo "  # or"
echo "  docker run --rm --network traefik-network \\"
echo "    -e DATABASE_URL=\"${DATABASE_URL}\" \\"
echo "    -e DATABASE_URL_LOCAL=\"${DATABASE_URL}\" \\"
echo "    -v \"\$(pwd)/prisma:/app/prisma:ro\" \\"
echo "    -w /app \\"
echo "    ai-hub-be-api-gateway:latest \\"
echo "    sh -c \"npx prisma migrate deploy\""

