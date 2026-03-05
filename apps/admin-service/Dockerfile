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

# Copy admin-service app
COPY apps/admin-service ./apps/admin-service

# Configure npm settings and install dependencies with retry
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 10 && \
    npm config set fetch-timeout 300000 && \
    npm ci --no-audit --no-fund --prefer-offline || \
    (sleep 5 && npm ci --no-audit --no-fund --prefer-offline) || \
    (sleep 10 && npm ci --no-audit --no-fund)

# Generate Prisma Client
RUN npx prisma generate

# Build Admin Service
RUN npx nest build admin-service

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
    CMD node -e "require('http').get('http://localhost:9002/', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose port
EXPOSE 9002

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start application
CMD ["node", "dist/apps/admin-service/apps/admin-service/src/main.js"]
 