import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { getEnvFilePath } from '@app/shared';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { MulterModule } from '@nestjs/platform-express';
import { MulterConfigService } from '@app/shared/multer.config';
import { RabbitMQModule } from '@app/rabbitmq';
import { SharedModule } from '@app/shared';
import { RedisModule } from '@app/redis';
import { AuthController } from './controller/auth.controller';
import { BlogController } from './controller/blog.controller';
import { NotificationController } from './controller/notification.controller';
import { ToolServiceController } from './controller/tool.controller';
import { MediaController } from './controller/media.controller';
import { WebInfoController } from './controller/web-info-controller';
import { AdminController } from './controller/admin.controller';
import { SupportController } from './controller/support.controller';
import { CourseController } from './controller/course.controller';
import { ToolMarketingController } from './controller/tool-marketing.controller';
import { LandingController } from './controller/landing.controller';
import { ApiGatewayService } from './services/api-gateway.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import {
  AUTH_CLIENT,
  BLOG_CLIENT,
  NOTIFICATION_CLIENT,
  API_GATEWAY_CLIENT,
  AUTH_QUEUE,
  BLOG_SERVICE_QUEUE,
  NOTIFICATION_QUEUE,
  API_GATEWAY_QUEUE,
} from '@app/common';
import * as fs from 'fs';

/**
 * Helper function to get RabbitMQ URL with automatic hostname conversion
 * Converts 'rabbitmq' hostname to 'localhost' when running locally (not in Docker)
 */
function getRabbitMQUrl(): string {
  // Detect if running inside Docker container
  let isDocker = false;
  try {
    isDocker = 
      process.env.DOCKER_ENV === 'true' ||
      process.env.RUNNING_IN_DOCKER === 'true' ||
      (fs.existsSync('/.dockerenv')) ||
      (fs.existsSync('/proc/self/cgroup') && 
        fs.readFileSync('/proc/self/cgroup', 'utf8').includes('docker'));
  } catch (error) {
    // If check fails (e.g., on Windows), assume not in Docker
    isDocker = false;
  }

  const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672';
  
  // If running locally and URL has Docker hostname, auto-convert to localhost
  if (!isDocker && rabbitmqUrl.includes('@rabbitmq:')) {
    const convertedUrl = rabbitmqUrl.replace(/@rabbitmq:/g, '@localhost:');
    console.warn(
      '⚠️ [API Gateway] Detected Docker hostname (rabbitmq) but running locally. Auto-converting to localhost.'
    );
    return convertedUrl;
  }
  
  return rabbitmqUrl;
}

// Get RabbitMQ URL with automatic hostname conversion
const rabbitmqUrl = getRabbitMQUrl();
console.log(`🔗 [API Gateway] RabbitMQ URL: ${rabbitmqUrl.replace(/:([^:@]+)@/, ':****@')}`);

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: getEnvFilePath() }),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: {
        expiresIn: process.env.JWT_EXPIRATION
          ? parseInt(process.env.JWT_EXPIRATION)
          : 3600,
      },
    }),
    // Configure RabbitMQ clients for microservices
    // All clients use RABBITMQ_URL from .env file with automatic hostname conversion
    ClientsModule.register([
      {
        name: AUTH_CLIENT,
        transport: Transport.RMQ,
        options: {
          urls: [rabbitmqUrl],
          queue: process.env.AUTH_SERVICE_QUEUE || AUTH_QUEUE,
          queueOptions: { durable: true },
        },
      },
      {
        name: BLOG_CLIENT,
        transport: Transport.RMQ,
        options: {
          urls: [rabbitmqUrl],
          queue: process.env.BLOG_SERVICE_QUEUE || BLOG_SERVICE_QUEUE,
          queueOptions: { durable: true },
        },
      },
      {
        name: NOTIFICATION_CLIENT,
        transport: Transport.RMQ,
        options: {
          urls: [rabbitmqUrl],
          queue: process.env.NOTIFICATION_SERVICE_QUEUE || 'NOTIFICATION_SERVICE_QUEUE',
          queueOptions: { durable: true },
        },
      },
      {
        name: 'TOOL_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [rabbitmqUrl],
          queue: process.env.TOOL_SERVICE_QUEUE || 'TOOL_SERVICE_QUEUE',
          queueOptions: { durable: true },
        },
      },
      {
        name: 'MEDIA_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [rabbitmqUrl],
          queue: 'MEDIA_SERVICE_QUEUE',
          queueOptions: { durable: true },
        },
      },
      {
        name: 'WEB_INFO_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [rabbitmqUrl],
          queue: process.env.WEB_INFO_SERVICE_QUEUE || 'web_info_service_queue',
          queueOptions: { durable: true },
        },
      },
      {
        name: 'HOMEPAGE_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [rabbitmqUrl],
          queue: process.env.HOMEPAGE_SERVICE_QUEUE || 'homepage_service_queue_v2',
          queueOptions: { durable: true },
        },
      },
      {
        name: 'ADMIN_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [rabbitmqUrl],
          queue: process.env.ADMIN_SERVICE_QUEUE || 'ADMIN_SERVICE_QUEUE',
          queueOptions: { durable: true },
        },
      },
      {
        name: 'SUPPORT_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [rabbitmqUrl],
          queue: process.env.SUPPORT_SERVICE_QUEUE || 'support_service_queue',
          queueOptions: { durable: true },
        },
      },
      {
        name: 'COURSE_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [rabbitmqUrl],
          queue: process.env.COURSE_SERVICE_QUEUE || 'COURSE_SERVICE_QUEUE',
          queueOptions: { durable: true },
        },
      },
      {
        name: 'TOOL_MARKETING_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [rabbitmqUrl],
          queue: process.env.TOOL_MARKETING_SERVICE_QUEUE || 'tool_marketing_service_queue',
          queueOptions: { durable: true },
        },
      },
    ]),
    MulterModule.registerAsync({
      useClass: MulterConfigService,
    }),
    SharedModule,
    RedisModule,
    RabbitMQModule.registerRmq(API_GATEWAY_CLIENT, API_GATEWAY_QUEUE),
  ],
  controllers: [
    AuthController,
    BlogController,
    NotificationController,
    ToolServiceController,
    MediaController,
    WebInfoController,
    AdminController,
    SupportController,
    CourseController,
    ToolMarketingController,
    LandingController,
  ],
  providers: [ApiGatewayService, JwtStrategy, MulterConfigService],
})
export class ApiGatewayModule { }