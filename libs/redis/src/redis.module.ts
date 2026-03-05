import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { REDIS_CLIENT, RedisService } from './redis.service';
import dns from 'dns/promises';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: async (configService: ConfigService) => {
        let host = configService.get<string>('REDIS_HOST') || 'localhost';
        const port = configService.get<number>('REDIS_PORT') || 6379;
        const password = configService.get<string>('REDIS_PASSWORD');
        const db = configService.get<number>('REDIS_DB') || 0;

        // Try resolving the hostname; only fallback to localhost if:
        // 1. Not in production AND
        // 2. Hostname is not a Docker service name (redis, rabbitmq, postgres, etc.)
        const isProduction = process.env.NODE_ENV === 'production';
        const isDockerServiceName = ['redis', 'rabbitmq', 'postgres', 'pgadmin'].includes(host);
        
        if (!isProduction && !isDockerServiceName) {
          try {
            await dns.lookup(host);
          } catch (err) {
            // log a warning and fallback only in dev for non-Docker service names
            // eslint-disable-next-line no-console
            console.warn(`Could not resolve Redis hostname '${host}', falling back to localhost`);
            host = 'localhost';
          }
        }

        // Only include password if it's provided and not empty
        // For local dev, Redis usually doesn't require password
        const redisOptions: any = {
          host,
          port,
          db,
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          enableReadyCheck: false,
          maxRetriesPerRequest: null,
        };

        // Only add password if it's provided and not empty
        if (password && password.trim() !== '') {
          redisOptions.password = password;
        }

        return new Redis(redisOptions);
      },
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule {}