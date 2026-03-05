import { loadEnvFile } from '@app/shared';
import { NestFactory } from '@nestjs/core';
import { AdminServiceModule } from './admin-service.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';

// Load environment variables before NestJS starts
loadEnvFile();

async function bootstrap() {
  const app = await NestFactory.create(AdminServiceModule);
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
    Number(config.get('ADMIN_SERVICE_PORT')) || Number(process.env.PORT) || 3002;

  // Connect RMQ microservice listener so this service can receive RPC calls
  const rmqUrl = config.get('RABBITMQ_URL') as string | undefined;
  const rmqHost = config.get('RABBITMQ_HOST') || (process.env.NODE_ENV === 'production' ? 'rabbitmq' : 'localhost');
  const rmqPort = config.get('RABBITMQ_PORT') || 5672;
  const rmqUser = config.get('RABBITMQ_DEFAULT_USER') || 'admin';
  const rmqPass = config.get('RABBITMQ_DEFAULT_PASS') || 'admin123';
  const queue = config.get('ADMIN_SERVICE_QUEUE') || 'ADMIN_SERVICE_QUEUE';

  const urls = rmqUrl ? [rmqUrl] : [`amqp://${rmqUser}:${rmqPass}@${rmqHost}:${rmqPort}`];

  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls,
      queue,
      queueOptions: { durable: true },
    },
  });

  await app.startAllMicroservices();
  await app.listen(port);
  console.log(`✅ admin Service is running on port ${port}`);
}
void bootstrap();
