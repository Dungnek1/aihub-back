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

# Copy web-info-service app
COPY apps/web-info-service ./apps/web-info-service

# Configure npm settings and install dependencies with retry
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 10 && \
    npm config set fetch-timeout 600000 && \
    for i in $(seq 1 3); do \
        npm ci --no-audit --no-fund && break || \
        (echo "npm install failed, attempt $i/3" && sleep 10); \
    done

# Generate Prisma Client
RUN npx prisma generate

# Build Web Info Service
RUN npx nest build web-info-service

# ============================================
# STAGE 2: Production
# ============================================
FROM node:22.19-alpine

WORKDIR /app

# Install dumb-init and openssl for proper signal handling
RUN apk add --no-cache dumb-init openssl

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy node_modules, dist and prisma from builder
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# Generate Prisma Client for Alpine Linux with OpenSSL 3.0.x
RUN npx prisma generate

# Switch to nodejs user
USER nestjs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:9007/', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose port
EXPOSE 9007

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start application
CMD ["node", "dist/apps/web-info-service/main.js"]