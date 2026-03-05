import { loadEnvFile } from '@app/shared';
import { NestFactory } from '@nestjs/core';
import { NotificationServiceModule } from './notification-service.module';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';

// Load environment variables before NestJS starts
loadEnvFile();

async function bootstrap() {
  const app = await NestFactory.create(NotificationServiceModule);
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const config = app.get(ConfigService);
  const port =
    Number(config.get('NOTIFICATION_SERVICE_PORT')) || 3004;

  // Connect RMQ microservice listener so this service can receive RPC calls
  const rmqUrl = config.get('RABBITMQ_URL') as string | undefined;
  const rmqHost = config.get('RABBITMQ_HOST') || (process.env.NODE_ENV === 'production' ? 'rabbitmq' : 'localhost');
  const rmqPort = config.get('RABBITMQ_PORT') || 5672;
  const rmqUser = config.get('RABBITMQ_DEFAULT_USER') || 'admin';
  const rmqPass = config.get('RABBITMQ_DEFAULT_PASS') || 'admin123';
  const queue = config.get('NOTIFICATION_SERVICE_QUEUE') || 'notification_service_queue';

  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: [rmqUrl || `amqp://${rmqUser}:${rmqPass}@${rmqHost}:${rmqPort}`],
      queue,
      queueOptions: { durable: true },
    },
  });

  await app.startAllMicroservices();
  await app.listen(port);
  console.log(`✅ notifications Service is running on port ${port}`);
}
void bootstrap();
