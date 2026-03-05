import { ClientsModule, Transport } from '@nestjs/microservices';
import { ToolServiceController } from './controller/tool-service.controller';
import { ToolServiceService } from './services/tool-service.service';
import { ConfigModule } from '@nestjs/config';
import { getEnvFilePath } from '@app/shared';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from '@app/shared';
import { RedisModule } from '@app/redis';
import { DatabaseModule } from '@app/database';
import { RabbitMQModule } from '@app/rabbitmq';
import { Module } from '@nestjs/common';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: getEnvFilePath() }),
    ClientsModule.register([
      {
        name: 'API_GATEWAY_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672'],
          queue: process.env.API_GATEWAY_QUEUE || 'API_GATEWAY_QUEUE',
          queueOptions: { durable: true },
        },
      },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: {
        expiresIn: process.env.JWT_EXPIRATION
          ? parseInt(process.env.JWT_EXPIRATION)
          : 3600,
      },
    }),
    PassportModule,
    SharedModule,
    RedisModule,
    DatabaseModule,
    RabbitMQModule.registerRmq('TOOL_CLIENT', 'tool_service_queue'),
    RabbitMQModule.registerRmq('NOTIFICATION_CLIENT', 'NOTIFICATION_SERVICE_QUEUE'),
  ],
  controllers: [ToolServiceController],
  providers: [ToolServiceService],
})
export class ToolServiceModule { }
