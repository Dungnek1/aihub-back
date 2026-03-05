#!/bin/bash
# Restart Infrastructure Services
# Restarts postgres, pgadmin, rabbitmq, redis, redis-commander if needed

set -e

echo "Restarting infrastructure services..."
echo ""

# List of infrastructure services
INFRA_SERVICES=(
  "postgres"
  "pgadmin"
  "rabbitmq"
  "redis"
  "redis-commander"
)

# Step 1: Stop services
echo "Step 1: Stopping infrastructure services..."
docker compose stop "${INFRA_SERVICES[@]}" || true

# Step 2: Start services
echo ""
echo "Step 2: Starting infrastructure services..."
docker compose up -d "${INFRA_SERVICES[@]}"

# Step 3: Wait for services to be healthy
echo ""
echo "Step 3: Waiting for services to be healthy (30 seconds)..."
sleep 30

# Step 4: Verify services are running
echo ""
echo "Step 4: Verifying services..."
failed_services=()
for service in "${INFRA_SERVICES[@]}"; do
  container_name="aihub_${service//-/_}"
  if ! docker ps | grep -q "${container_name}"; then
    failed_services+=("${service}")
  fi
done

if [ ${#failed_services[@]} -gt 0 ]; then
  echo "⚠ Warning: The following services may not be running:"
  printf '  - %s\n' "${failed_services[@]}"
  echo ""
  echo "Checking logs..."
  for service in "${failed_services[@]}"; do
    echo "--- Logs for ${service} ---"
    docker compose logs --tail=50 "${service}" || true
  done
else
  echo "✓ All infrastructure services are running"
fi

echo ""
echo "Infrastructure services status:"
docker compose ps "${INFRA_SERVICES[@]}"
echo ""
echo "To view logs:"
echo "   docker compose logs -f [service-name]"

