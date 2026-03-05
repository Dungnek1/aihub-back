# ============================================
# STAGE 1: Build
# ============================================
FROM node:22.19-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./

# Copy NestJS CLI config
COPY nest-cli.json ./

# Copy libs
COPY libs ./libs

# Copy prisma schema
COPY prisma ./prisma

# Copy api-gateway app
COPY apps/api-gateway ./apps/api-gateway

# Configure npm settings and install dependencies with retry
RUN npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 10 && \
    npm config set fetch-timeout 600000 && \
    for i in $(seq 1 3); do \
        npm ci --no-audit --no-fund && break || \
        (echo "npm install failed, attempt $i/3" && sleep 10); \
    done

# Generate Prisma Client
RUN npx prisma generate

# Build API Gateway
RUN npx nest build api-gateway

# Check the built files
RUN ls -la dist/

# ============================================
# STAGE 2: Production
# ============================================
FROM node:22.19-alpine

WORKDIR /app

# Install dumb-init, openssl, and su-exec for proper signal handling and user switching
RUN apk add --no-cache dumb-init openssl su-exec

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy node_modules, dist and prisma from builder
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# Copy entrypoint script
COPY apps/api-gateway/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Generate Prisma Client for Alpine Linux with OpenSSL 3.0.x
RUN npx prisma generate

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:9000/', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose port
EXPOSE 9000

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--", "/usr/local/bin/docker-entrypoint.sh"]

# Start application - entrypoint script will handle permissions and user switching
CMD ["node", "dist/apps/api-gateway/apps/api-gateway/src/main.js"]
