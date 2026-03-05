import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import dns from 'dns/promises';
import { URL } from 'url';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private client: ClientProxy;

  constructor(private readonly configService: ConfigService) { }

  async onModuleInit() {
    let host = this.configService.get<string>('RABBITMQ_HOST') || 'localhost';
    const port = this.configService.get<string>('RABBITMQ_PORT') || '5672';
    let url = this.configService.get<string>('RABBITMQ_URL');

    // If an explicit URL was provided, try to validate its hostname first.
    if (url) {
      try {
        const parsed = new URL(url);
        try {
          await dns.lookup(parsed.hostname);
        } catch (err) {
          this.logger.warn(
            `Could not resolve RabbitMQ hostname '${parsed.hostname}', falling back to localhost`,
          );
          parsed.hostname = 'localhost';
          // rebuild url preserving auth/port/path
          url = parsed.toString();
        }
      } catch (e) {
        // ignore URL parse errors and fall back to host/port
        url = undefined;
      }
    }

    if (!url) {
      // Try DNS lookup for configured host and fall back to localhost if it fails.
      try {
        await dns.lookup(host);
      } catch (err) {
        this.logger.warn(
          `Could not resolve RabbitMQ hostname '${host}', falling back to localhost`,
        );
        host = 'localhost';
      }
      url = this.configService.get<string>('RABBITMQ_URL') || `amqp://${host}:${port}`;
    }
    const queue =
      this.configService.get<string>('RABBITMQ_QUEUE') ||
      this.configService.get<string>('RABBITMQ_QUEUE_PREFIX') ||
      'default_queue';

    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [url],
        queue,
        queueOptions: { durable: true },
      },
    });
    try {
      await this.client.connect();
      this.logger.log('Connected to RabbitMQ via ClientProxy');
    } catch (err) {
      this.logger.error('Failed to connect RabbitMQ client', err);
      // don't throw here; let callers handle connectivity failures
    }
  }

  async onModuleDestroy() {
    try {
      await this.client.close();
      this.logger.log('Closed RabbitMQ client');
    } catch (err) {
      this.logger.error('Error closing RabbitMQ client', err);
    }
  }

  // Publish fire-and-forget
  publish(pattern: string, data: any): Observable<any> {
    return this.client.emit(pattern, data);
  }

  // Request/response
  async request<T = any, R = any>(pattern: string, data: T): Promise<R> {
    const obs = this.client.send<R, T>(pattern, data);
    return firstValueFrom(obs);
  }

  // Convenience: publish and wait for completion (convert to Promise)
  async publishAndWait(pattern: string, data: any): Promise<void> {
    await firstValueFrom(this.client.emit(pattern, data));
  }
}

export default RabbitMQService;
