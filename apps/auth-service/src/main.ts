import { loadEnvFile } from '@app/shared';
import { NestFactory } from '@nestjs/core';
import { AuthServiceModule } from './auth-service.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';

// Load environment variables before NestJS starts
loadEnvFile();

async function bootstrap() {
  const app = await NestFactory.create(AuthServiceModule);

  // Enable CORS
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
    Number(config.get('AUTH_SERVICE_PORT')) || Number(process.env.PORT) || 3002;

  // Connect RMQ microservice listener so this service can receive RPC calls
  const rmqUrl = config.get('RABBITMQ_URL') as string | undefined;
  const rmqHost = config.get('RABBITMQ_HOST') || (process.env.NODE_ENV === 'production' ? 'rabbitmq' : 'localhost');
  const rmqPort = config.get('RABBITMQ_PORT') || 5672;
  const rmqUser = config.get('RABBITMQ_DEFAULT_USER') || 'admin';
  const rmqPass = config.get('RABBITMQ_DEFAULT_PASS') || 'admin123';
  const queue = config.get('AUTH_SERVICE_QUEUE') || 'auth_service_queue';

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
  console.log(`✅ Auth Service is running on port ${port}`);
}
void bootstrap();
