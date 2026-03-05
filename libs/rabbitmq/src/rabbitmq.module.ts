import { DynamicModule, Module } from '@nestjs/common';
import {
  ClientsModule,
  Transport,
  ClientProxyFactory,
} from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitmqService } from './rabbitmq.service';
import { getEnvFilePath } from '@app/shared';
import * as fs from 'fs';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: getEnvFilePath(),
    }),
  ],
  providers: [RabbitmqService],
  exports: [RabbitmqService],
})
export class RabbitMQModule {
  static registerRmq(service: string, queue: string): DynamicModule {
    const providers = [
      {
        provide: service,
        useFactory: (configService: ConfigService) => {
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

          const defaultUser = configService.get<string>('RABBITMQ_DEFAULT_USER') || 'admin';
          const defaultPass = configService.get<string>('RABBITMQ_DEFAULT_PASS') || 'admin123';
          const defaultPort = configService.get<string>('RABBITMQ_PORT') || '5672';
          const defaultHost = isDocker ? 'rabbitmq' : 'localhost';
          
          let url =
            configService.get<string>('RABBITMQ_URL') ||
            `amqp://${defaultUser}:${defaultPass}@${defaultHost}:${defaultPort}`;
          
          // If running locally and URL has Docker hostname, auto-convert to localhost
          if (!isDocker && url.includes('@rabbitmq:')) {
            url = url.replace(/@rabbitmq:/g, '@localhost:');
            console.warn(
              `⚠️ [RabbitMQ] ${service} - Detected Docker hostname (rabbitmq) but running locally. Auto-converting to localhost.`
            );
          }
          
          // Log the URL being used for debugging (hide password)
          const safeUrl = url.replace(/:([^:@]+)@/, ':****@');
          const envMode = isDocker ? '🐳 Docker' : '💻 Local';
          console.log(`🔗 [RabbitMQ] ${service} ${envMode} - Connecting to: ${safeUrl}`);
          
          const client = ClientProxyFactory.create({
            transport: Transport.RMQ,
            options: {
              urls: [url],
              queue,
              queueOptions: {
                durable: true,
              },
              prefetchCount: 5,
              socketOptions: {
                reconnectTimeInSeconds: 5,
              },
            },
          });

          client.connect().catch((err) => {
            console.error(
              `[RabbitMQ] Initial connection error for service "${service}":`,
              err,
            );
          });

          return client;
        },
        inject: [ConfigService],
      },
    ];

    return {
      module: RabbitMQModule,
      providers,
      exports: providers,
    };
  }
}
