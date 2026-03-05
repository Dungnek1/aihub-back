import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RmqContext, RmqOptions, Transport } from '@nestjs/microservices';

@Injectable()
export class RabbitmqService {
  constructor(private readonly configService: ConfigService) {}

  getOptions(queue: string): RmqOptions {
    const url = this.configService.get('RABBITMQ_URL');
    return {
      transport: Transport.RMQ,
      options: {
        urls: [url],
        queue: queue,
        queueOptions: {
          durable: true,
        },
        prefetchCount: 10,
        socketOptions: {
          reconnectTimeInSeconds: 5,
        },
      },
    };
  }

  ack(context: RmqContext) {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    channel.ack(message);
  }
}
