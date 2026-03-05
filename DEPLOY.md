# Production Deployment Guide

## Ubuntu Server Deployment

### Prerequisites

1. **Node.js** (v18+) đã được cài đặt - cần cho wrapper script
2. **Docker** và **Docker Compose** đã được cài đặt
3. File `.env` đã được cấu hình đúng
4. Network `traefik-network` đã được tạo (nếu dùng Traefik)
5. User có quyền chạy Docker (thêm vào docker group: `sudo usermod -aG docker $USER`)

**Kiểm tra prerequisites**:
```bash
# Kiểm tra Node.js
node --version  # Cần >= v18

# Kiểm tra Docker
docker --version
docker compose version

# Kiểm tra quyền Docker
docker ps  # Nếu bị lỗi permission, cần thêm user vào docker group
```

### Quick Deploy

```bash
# Chạy deploy script (có kiểm tra và rollback tự động)
npm run deploy:prod

# Hoặc chạy trực tiếp (tự động detect OS)
node scripts/deploy-production.js

# Hoặc chạy trực tiếp với script cụ thể
# Windows:
powershell -ExecutionPolicy Bypass -File scripts/deploy-production.ps1
# Linux/Mac:
bash scripts/deploy-production.sh
```

**Lưu ý**: Script hoàn toàn tự động, không cần can thiệp thủ công:
- ✅ **Pre-checks**: Kiểm tra syntax docker-compose.yml, .env file
- ✅ **Backup**: Tự động backup images hiện tại
- ✅ **Build**: Build lại với code mới nhất (--no-cache)
- ✅ **Health Check**: Kiểm tra services sau khi start
- ✅ **Auto Rollback**: Tự động rollback nếu có bất kỳ lỗi nào
- ✅ **Verification**: Kiểm tra lại sau 5 giây để đảm bảo ổn định

**Lưu ý**: Migration cần chạy riêng bằng `npm run migrate:resolve` trước khi deploy (nếu có failed migrations).

### Manual Deploy Steps

Nếu muốn deploy thủ công:

```bash
# 1. Stop services
docker compose stop api-gateway auth-service admin-service blog-service media-service notification-service tool-service support-service tool-marketing-service course-service

# 2. Remove containers (volumes preserved)
docker compose rm -f api-gateway auth-service admin-service blog-service media-service notification-service tool-service support-service tool-marketing-service course-service

# 3. Build images with latest code (no cache)
docker compose build --no-cache api-gateway auth-service admin-service blog-service media-service notification-service tool-service support-service tool-marketing-service course-service

# 4. Recreate and start services
docker compose up -d --force-recreate --no-deps api-gateway auth-service admin-service blog-service media-service notification-service tool-service support-service tool-marketing-service course-service
```

**Lưu ý**: Flag `--no-cache` đảm bảo build lại từ đầu với code mới nhất, không dùng cache cũ.

### Setup Script Permissions

Trên Ubuntu server, script sẽ tự động hoạt động vì:
- Wrapper script Node.js (`deploy-production.js`) tự động detect OS và chạy bash script
- Không cần set quyền thực thi vì dùng `bash script.sh` thay vì chạy trực tiếp

**Lưu ý**: Nếu muốn chạy trực tiếp bash script (không qua npm), cần set quyền:
```bash
chmod +x scripts/deploy-production.sh
chmod +x scripts/rollback.sh
chmod +x scripts/restart-infrastructure.sh
```

**Prerequisites trên Ubuntu Server**:
- Node.js (v18+) đã được cài đặt
- Docker và Docker Compose đã được cài đặt
- User có quyền chạy Docker (thường cần thêm vào docker group: `sudo usermod -aG docker $USER`)

### Services Deployed

Script sẽ recreate các application services sau:
- api-gateway
- auth-service
- admin-service
- blog-service
- media-service
- notification-service
- tool-service
- support-service
- tool-marketing-service
- course-service

### Infrastructure Services (Not Affected)

Các services sau sẽ không bị ảnh hưởng:
- postgres
- pgadmin
- rabbitmq
- redis
- redis-commander

### View Logs

```bash
# View logs for a specific service
docker compose logs -f api-gateway
docker compose logs -f auth-service

# View all services logs
docker compose logs -f
```

### Rollback

Nếu deployment thất bại hoặc cần rollback về version cũ:

```bash
# Rollback tự động (nếu script phát hiện lỗi)
# Script sẽ tự động rollback

# Rollback thủ công
npm run rollback
# hoặc
bash scripts/rollback.sh
```

**Lưu ý**: Rollback chỉ hoạt động nếu có backup images từ lần deploy trước.

### Migration

**Migration không được chạy tự động trong deploy script**. Cần chạy riêng:

```bash
# Nếu có failed migrations, resolve trước
npm run migrate:resolve

# Sau đó chạy migrations thủ công (nếu cần)
docker run --rm --network traefik-network \
  -e DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}" \
  -e DATABASE_URL_LOCAL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}" \
  -v "$(pwd)/prisma:/app/prisma:ro" \
  -w /app \
  ai-hub-be-api-gateway:latest \
  sh -c "npx prisma migrate deploy"
```

**Lưu ý**: Đảm bảo file `.env` có đúng thông tin database (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`).

### Resolve Failed Migrations

Nếu gặp lỗi `P3009: failed migrations`, có thể resolve nhanh bằng script riêng:

```bash
# Tự động detect và resolve failed migration
npm run migrate:resolve

# Hoặc chỉ định migration name cụ thể
npm run migrate:resolve 20251117042444_add_support_contact_request

# Hoặc chạy trực tiếp
node scripts/resolve-failed-migrations.js
bash scripts/resolve-failed-migrations.sh [migration_name]
```

Script sẽ:
- Tự động detect failed migration (nếu không chỉ định)
- Thử resolve as `--rolled-back` trước (an toàn hơn)
- Nếu không được, thử resolve as `--applied`
- Verify migration status sau khi resolve

### Restart Infrastructure Services

Nếu cần restart các infrastructure services (postgres, pgadmin, rabbitmq, redis):

```bash
# Restart tất cả infrastructure services
npm run restart:infra
# hoặc
bash scripts/restart-infrastructure.sh
```

**Lưu ý**: Chỉ restart khi thực sự cần thiết (ví dụ: cấu hình thay đổi, lỗi kết nối).

### Troubleshooting

1. **Permission denied khi chạy Docker**: 
   ```bash
   sudo usermod -aG docker $USER
   newgrp docker  # Hoặc logout/login lại
   ```

2. **Node.js not found**: 
   ```bash
   # Cài Node.js trên Ubuntu
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Network not found**: 
   ```bash
   docker network create traefik-network
   ```

4. **Build fails**: Script sẽ tự động rollback về version cũ

5. **Services not starting**: Script sẽ tự động rollback và hiển thị logs

6. **No backup for rollback**: Cần rebuild từ git commit cũ hoặc restore từ backup

7. **Migration fails**: Kiểm tra `.env` file có đúng `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` không

