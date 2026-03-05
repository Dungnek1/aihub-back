# ============================================
# STAGE 1: Build
# ============================================
FROM node:22.19-alpine AS builder

WORKDIR /app

# 1. Copy tất cả các file package và cài đặt TOÀN BỘ dependencies (bao gồm cả @prisma/cli)
COPY package*.json ./
RUN npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 10 && \
    npm config set fetch-timeout 600000 && \
    for i in $(seq 1 3); do \
        npm ci --no-audit --no-fund && break || \
        (echo "npm install failed, attempt $i/3" && sleep 10); \
    done

# 2. Copy file schema.prisma
# (SỬA LỖI 1: Thêm dòng này để copy schema)
COPY prisma ./prisma

# 3. Chạy prisma generate. Lệnh này cần @prisma/cli (từ npm ci) và schema.prisma
# (Kết quả sẽ được lưu trong node_modules/@prisma/client)
RUN npx prisma generate

# 4. Copy toàn bộ code (configs, libs, app source)
COPY tsconfig.json ./
COPY tsconfig.build.json ./
COPY nest-cli.json ./
COPY libs ./libs
COPY apps/notification-service ./apps/notification-service

# 5. Build ứng dụng (Tạo thư mục 'dist')
RUN npx nest build notification-service

# ============================================
# STAGE 2: Production
# ============================================
FROM node:22.19-alpine

WORKDIR /app

# Install dumb-init and openssl
RUN apk add --no-cache dumb-init openssl

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy các thư mục đã build từ STAGE 1
# 1. Copy node_modules (đã bao gồm Prisma Client)
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
# 2. Copy code đã biên dịch
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
# 3. Copy prisma schema
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# Generate Prisma Client for Alpine Linux with OpenSSL 3.0.x
RUN npx prisma generate

# Switch to non-root user
USER nestjs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:9004/', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose port
EXPOSE 9004

# Use dumb-init
ENTRYPOINT ["/usr/bin/dumb-init", "--"]


# Start application
CMD ["node", "dist/apps/notification-service/apps/notification-service/src/main.js"]
