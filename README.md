🚀 **AI Hub Backend**

Backend của nền tảng AI Hub, được xây dựng theo mô hình **NestJS monorepo microservices**, sử dụng **PostgreSQL + Prisma**, **Redis**, **RabbitMQ** nhằm đảm bảo hiệu năng, khả năng mở rộng và giao tiếp giữa các service.

---

## 📚 Table of Contents

1. Tech Stack  
2. Project Structure  
3. Run Project Locally  
4. Database & Docker Commands  
5. Services & Ports  
6. Troubleshooting  
7. Development Guidelines  

---

## 🧰 1. Tech Stack

### Core

- **NestJS 11** (monorepo, microservices)
- **TypeScript**

### Data & Messaging

- **PostgreSQL** + **Prisma ORM**
- **Redis** (caching)
- **RabbitMQ** (message broker, queue)

### Tooling

- **Docker & Docker Compose**
- **Jest** (test)
- **ESLint + Prettier**

---

## 🗂 2. Project Structure

```text
aihub-back/
├── apps/                         # Microservices NestJS
│   ├── api-gateway/              # API Gateway - entry point chính cho FE
│   ├── auth-service/             # Auth, JWT, user
│   ├── admin-service/            # Nghiệp vụ admin
│   ├── blog-service/             # Bài viết, categories, analytics
│   ├── tool-service/             # AI tools
│   ├── tool-marketing-service/   # Marketing tools, courses marketing
│   ├── notification-service/     # Thông báo, WebSocket
│   ├── media-service/            # Upload & quản lý media
│   ├── support-service/          # Support, contact, newsletter, activity log
│   ├── course-service/           # Khoá học, rating, usage
│   └── web-info-service/         # Thông tin & cấu hình website
│
├── libs/                         # Shared libraries
│   ├── common/                   # Hằng số, enums, utils
│   ├── database/                 # Prisma + kết nối PostgreSQL
│   ├── rabbitmq/                 # Kết nối RabbitMQ
│   ├── redis/                    # Kết nối Redis
│   └── shared/                   # Env loader, DTO, multer, helper chung
│
├── prisma/                       # Prisma schema & migrations & seed
├── scripts/                      # Deploy, seed, rollback, sync env...
├── docker-compose.yml            # Hạ tầng: Postgres, Redis, RabbitMQ
├── docker-compose.dev.yml
├── package.json
└── tsconfig*.json
```

---

## ▶️ 3. Run Project Locally

### 3.1. Prerequisites

Cần cài:

- Node.js v18+
- Docker & Docker Compose
- npm

### 3.2. Clone Repository

```bash
git clone https://github.com/Dungnek1/aihub-back.git
cd aihub-back
```

### 3.3. Install Dependencies

```bash
npm install -f
```

### ⚙️ 3.4. Environment Variables

Tạo file `.env` (hoặc `.env.docker` làm mẫu) với các biến quan trọng:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/aihub
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://guest:guest@localhost:5672

JWT_SECRET=your-jwt-secret
API_GATEWAY_BASE_URL=http://localhost:3000
# ... thêm các biến khác nếu cần
```

### 🐳 3.5. Start Infrastructure (DB, Cache, MQ)

```bash
docker compose up -d
```

Docker sẽ start:

- PostgreSQL
- Redis
- RabbitMQ

### 🗄 3.6. Prepare Database (Prisma)

```bash
# Generate Prisma client
npm run db:generate

# Push schema + migrate + generate client
npm run db:build
# hoặc:
# npm run db:push
# npm run db:migrate
```

### 🚀 3.7. Start All Services (Dev)

```bash
npm run start:dev:all
```

Command này sẽ chạy đồng thời:

- api-gateway
- auth-service
- admin-service
- blog-service
- tool-service
- tool-marketing-service
- notification-service
- media-service
- support-service
- course-service

### 🧪 3.8. Run Single Service (Dev)

```bash
npm run start:dev:api-gateway
npm run start:dev:auth
npm run start:dev:admin
npm run start:dev:blog
npm run start:dev:tool
npm run start:dev:notification
npm run start:dev:media
npm run start:dev:support
npm run start:dev:course
npm run start:dev:tool-marketing
```

---

## 🛢 4. Database & Docker Commands

### 4.1. Prisma / Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema
npm run db:push

# Migrate (dev / prod)
npm run db:migrate
npm run db:migrate:prod

# Reset DB (xoá toàn bộ data dev)
npm run db:reset

# Prisma Studio
npm run db:studio

# Seed dữ liệu
npm run db:seed
npm run db:seed:featured
npm run db:seed:posts
npm run db:seed:courses-tools

# Admin user
npm run db:create-admin
```

### 4.2. Docker Helpers (PowerShell scripts)

```bash
npm run docker:up        # docker-compose.ps1 up -d
npm run docker:down
npm run docker:logs
npm run docker:ps
npm run docker:build

# Production infra
npm run docker:prod:up
npm run docker:prod:down
```

---

## 🌐 5. Services & Ports

(Port có thể thay đổi theo cấu hình, đây là mapping mặc định/tham khảo)

| Service                | Port  | Mô tả                                       |
|------------------------|-------|---------------------------------------------|
| API Gateway            | 3000  | Entry point chính cho frontend              |
| Auth Service           | 3001  | Đăng nhập, đăng ký, JWT                     |
| Blog Service           | 3003  | Bài viết, categories, analytics             |
| Notification Service   | 3004  | Thông báo realtime (WebSocket)              |
| Tool Service           | 3005  | AI tools                                    |
| Media Service          | 3006  | Upload & quản lý media                      |
| Support/Course/...     | tuỳ   | Các service bổ trợ khác                     |

**API Docs (Swagger)**

- `http://localhost:3000/api` (qua API Gateway)

---

## 🛠 6. Troubleshooting

### ❌ Port conflict

- Kiểm tra các port `3000`, `5432`, `6379`, `5672`, ... có bị app khác chiếm không.
- Dùng `netstat` / `lsof` hoặc tắt app khác.

### ❌ Database không kết nối

- Kiểm tra container:

  ```bash
  docker ps
  ```

- Xem log:

  ```bash
  docker logs <container_name>
  ```

### ❌ Migration lỗi / schema lệch

- Dùng:

  ```bash
  npm run db:status
  npm run db:reset   # Cẩn thận: xoá toàn bộ data dev
  npm run db:build
  ```

### ❌ Frontend không gọi được API

- Kiểm tra `API_GATEWAY_BASE_URL` trong `.env`.
- Đảm bảo `api-gateway` đang chạy và không lỗi.

---

## 📏 7. Development Guidelines

- Viết code bằng **TypeScript**.
- Mỗi service phải dùng **DTO + validation** (`class-validator`, `class-transformer`).
- Tận dụng shared libs trong `libs/` (không copy/paste logic).
- Khi thêm feature:
  - Thiết kế contract qua API Gateway trước.
  - Mapping sang service con thông qua DTO + message pattern rõ ràng.
- Trước khi commit:
  - Chạy `npm run lint`
  - Chạy test nếu có: `npm test`

---

Project backend phục vụ cho **AI Hub Platform**.
