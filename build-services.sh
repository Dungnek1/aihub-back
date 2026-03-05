#!/bin/bash

# Tối ưu hóa Docker build với network retry
# Script này sẽ build từng service một cách tuần tự để tránh tải quá mạng

set -e

echo "🚀 Bắt đầu build AI Hub Backend Services..."

# Danh sách các services
services=(
    "api-gateway"
    "auth-service" 
    "admin-service"
    "blog-service"
    "notification-service"
    "tool-service"
    "media-service"
    "web-info-service"
)

# Build infrastructure services trước
echo "📦 Building infrastructure services..."
docker compose build postgres pgadmin rabbitmq redis redis-commander

# Build từng application service
for service in "${services[@]}"; do
    echo "🔧 Building $service..."
    
    # Retry mechanism cho từng service
    for attempt in {1..3}; do
        if docker-compose build "$service"; then
            echo "✅ $service built successfully"
            break
        else
            echo "❌ Build failed for $service (attempt $attempt/3)"
            if [ $attempt -eq 3 ]; then
                echo "💥 Failed to build $service after 3 attempts"
                exit 1
            fi
            echo "⏳ Waiting 30 seconds before retry..."
            sleep 30
        fi
    done
done

echo "🎉 All services built successfully!"
echo "🚀 You can now run: docker-compose up"