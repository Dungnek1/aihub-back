#!/bin/bash

# Script build đơn giản với retry cho từng service
echo "🏗️  Building AI Hub Services with retry mechanism..."

# Function để retry build
retry_build() {
    local service=$1
    local max_attempts=3
    
    for ((i=1; i<=max_attempts; i++)); do
        echo "📦 Building $service (attempt $i/$max_attempts)..."
        
        if docker-compose build "$service"; then
            echo "✅ $service built successfully!"
            return 0
        else
            echo "❌ Build failed for $service (attempt $i/$max_attempts)"
            if [ $i -lt $max_attempts ]; then
                echo "⏳ Waiting 30 seconds before retry..."
                sleep 30
                echo "🧹 Cleaning docker cache..."
                docker builder prune -f
            fi
        fi
    done
    
    echo "💥 Failed to build $service after $max_attempts attempts"
    return 1
}

# Build infrastructure first (these usually work)
echo "🔧 Building infrastructure services..."
docker-compose build postgres rabbitmq redis

# Build applications with retry
services=("api-gateway" "auth-service" "admin-service" "blog-service" "notification-service" "tool-service" "media-service" "web-info-service")

for service in "${services[@]}"; do
    if ! retry_build "$service"; then
        echo "💀 Critical failure building $service. Exiting."
        exit 1
    fi
done

echo "🎉 All services built successfully!"
echo ""
echo "🚀 Ready to run:"
echo "   docker-compose up"