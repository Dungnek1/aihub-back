import { loadEnvFile } from '@app/shared';
import { NestFactory } from '@nestjs/core';
import { WebInfoServiceModule } from './web-info-service.module';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';

// Load environment variables before NestJS starts
loadEnvFile();

async function bootstrap() {
  const app = await NestFactory.create(WebInfoServiceModule);
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
    Number(config.get('WEB_INFO_SERVICE_PORT')) || 3005;

  // Connect RMQ microservice listener so this service can receive RPC calls
  const rmqUrlFromEnv = config.get('RABBITMQ_URL') as string | undefined;
  const rmqUser = config.get('RABBITMQ_DEFAULT_USER') || 'admin';
  const rmqPass = config.get('RABBITMQ_DEFAULT_PASS') || 'admin123';
  const rmqPort = config.get('RABBITMQ_PORT') || '5672';
  const queue = config.get('WEB_INFO_SERVICE_QUEUE') || 'web_info_service_queue';

  // Detect if running in Docker
  const fs = require('fs');
  let isDocker = false;
  try {
    isDocker =
      process.env.DOCKER_ENV === 'true' ||
      process.env.RUNNING_IN_DOCKER === 'true' ||
      (fs.existsSync('/.dockerenv')) ||
      (fs.existsSync('/proc/self/cgroup') &&
        fs.readFileSync('/proc/self/cgroup', 'utf8').includes('docker'));
  } catch (error) {
    isDocker = false;
  }

  // Determine RabbitMQ host
  const defaultHost = isDocker ? 'rabbitmq' : 'localhost';
  let rmqUrl = rmqUrlFromEnv || `amqp://${rmqUser}:${rmqPass}@${defaultHost}:${rmqPort}`;

  // If running locally and URL has Docker hostname, auto-convert to localhost
  if (!isDocker && rmqUrl.includes('@rabbitmq:')) {
    rmqUrl = rmqUrl.replace(/@rabbitmq:/g, '@localhost:');
    console.warn('⚠️ [Web Info Service] Detected Docker hostname (rabbitmq) but running locally. Auto-converting to localhost.');
  }

  console.log(`🔗 [Web Info Service] RabbitMQ URL: ${rmqUrl.replace(/:([^:@]+)@/, ':****@')}`);

  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: [rmqUrl],
      queue,
      queueOptions: { durable: true },
    },
  });

  await app.startAllMicroservices();
  await app.listen(port);
  console.log(`✅ web-info Service is running on port ${port}`);
}
void bootstrap();
