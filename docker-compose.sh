#!/bin/bash
# Docker Compose Wrapper Script
# Tự động chọn file docker-compose và env file dựa trên môi trường

COMMAND="${1:-up}"
shift
ARGS="$@"

# Xác định môi trường từ NODE_ENV hoặc biến môi trường DOCKER_ENV
if [ -n "$DOCKER_ENV" ]; then
    ENV_TYPE="$DOCKER_ENV"
elif [ "$NODE_ENV" = "production" ]; then
    ENV_TYPE="production"
else
    ENV_TYPE="dev"
fi

# Chọn file docker-compose và env file
if [ "$ENV_TYPE" = "production" ]; then
    COMPOSE_FILE="docker-compose.yml"
    ENV_FILE=".env"
    echo "🚀 Using PRODUCTION configuration"
else
    COMPOSE_FILE="docker-compose.dev.yml"
    ENV_FILE=".env.dev"
    echo "🔧 Using DEV/LOCAL configuration"
fi

echo "📄 Compose file: $COMPOSE_FILE"
echo "📄 Env file: $ENV_FILE"

# Copy env file thành .env để docker-compose tự động load
# Only copy if source and destination are different
if [ -f "$ENV_FILE" ]; then
    ENV_FILE_ABS=$(cd "$(dirname "$ENV_FILE")" && pwd)/$(basename "$ENV_FILE")
    ENV_ABS=$(cd "$(dirname .env)" && pwd)/$(basename .env)
    
    if [ "$ENV_FILE_ABS" != "$ENV_ABS" ]; then
        cp "$ENV_FILE" .env
        echo "✅ Loaded environment from $ENV_FILE"
    else
        echo "✅ Using existing .env file"
    fi
else
    echo "⚠️  Warning: $ENV_FILE not found!"
fi

# Chạy docker-compose với file đã chọn
echo ""
echo "🔨 Running: docker-compose -f $COMPOSE_FILE $COMMAND $ARGS"
echo ""
docker-compose -f "$COMPOSE_FILE" $COMMAND $ARGS

