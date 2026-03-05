#!/bin/sh
set -e

# Create public directory structure if it doesn't exist
mkdir -p /app/public/image/tool-marketing
mkdir -p /app/public/image/course
mkdir -p /app/public/image/blog
mkdir -p /app/public/image/default
mkdir -p /app/public/audio

# Set correct permissions for public directory
# This ensures the nestjs user (UID 1001) can write to the volume
chown -R nestjs:nodejs /app/public 2>/dev/null || true
chmod -R 755 /app/public

# Switch to nestjs user and execute the main command
exec su-exec nestjs "$@"

