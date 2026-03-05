
# AI Hub Backend Development Setup

This guide will help Frontend developers set up and run the AI Hub backend services locally.

## Prerequisites

- Node.js (v18 or higher)
- Docker and Docker Compose
- npm or yarn

## Quick Start

### 1. Start Infrastructure Services

First, start the required infrastructure services using Docker Compose:

```bash
docker compose up -d
```

This will start:
- PostgreSQL database
- Redis cache
- RabbitMQ message broker

### 2. Install Dependencies

Install all project dependencies:

```bash
npm install -f
```

### 3. Start All Backend Services

Start all backend microservices in development mode:

```bash
npm run start:dev:all
```

This command will start the following services concurrently:
- API Gateway (production mode)
- Auth Service
- Blog Service
- Tool Service
- Notification Service
- Media Service

## Available Services

| Service | Port | Description |
|---------|------|-------------|
| API Gateway | 3000 | Main entry point for all API requests |
| Auth Service | 3001 | Handles authentication and authorization |
| Blog Service | 3003 | Manages blog posts, categories, and content |
| Tool Service | 3005 | AI tool management |
| Notification Service | 3004 | Real-time notifications via WebSocket |
| Media Service | 3006 | File upload and media management |

## Development Commands

### Individual Service Development

```bash
# Start specific services in development mode
npm run start:dev:api-gateway
npm run start:dev:auth
npm run start:dev:blog
npm run start:dev:notification
npm run start:dev:media
npm run start:dev:tool
```

### Database Commands

```bash
# Generate Prisma client
npm run db:generate

# Push schema changes to database
npm run db:push

# Reset database (WARNING: This will delete all data)
npm run db:reset

# Open Prisma Studio
npm run db:studio

# Run migrations
npm run db:migrate
```

### Build Commands

```bash
# Build all services
npm run build:all

# Build specific service
npm run build:api-gateway
npm run build:auth
npm run build:blog
npm run build:notification
```

## API Documentation

Once the services are running, you can access the API documentation at:
- Swagger UI: `http://localhost:3000/api`

## Environment Variables

Make sure to check the `.env` file for required environment variables. Key variables include:

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection URL
- `RABBITMQ_URL`: RabbitMQ connection URL
- `JWT_SECRET`: JWT signing secret
- `API_GATEWAY_BASE_URL`: Base URL for API Gateway

## Troubleshooting

### Common Issues

1. **Port conflicts**: Make sure ports 3000, 5432, 6379, 5672 are available
2. **Database connection**: Ensure Docker containers are running with `docker ps`
3. **Dependencies**: Run `npm install -f` if you encounter dependency issues

### Logs

Check service logs using:

```bash
# View all running containers
docker ps

# View logs for a specific service
docker logs <container_name>
```

## Project Structure

```
ai-hub-be/
├── apps/                    # Microservices
│   ├── api-gateway/        # Main API Gateway
│   ├── auth-service/       # Authentication
│   ├── blog-service/       # Blog management
│   ├── notification-service/ # Notifications
│   ├── media-service/      # Media handling
│   └── tool-service/       # AI tools
├── libs/                   # Shared libraries
│   ├── common/            # Common utilities
│   ├── database/          # Database configuration
│   ├── rabbitmq/          # Message queue
│   └── redis/             # Cache
├── prisma/                # Database schema and migrations
└── docker-compose.yml     # Infrastructure setup
```

## Support

If you encounter any issues, please check:
1. This README
2. Docker containers are running
3. Environment variables are set correctly
4. Ports are not in use by other applications

