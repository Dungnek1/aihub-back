import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getEnvFilePath } from '@app/shared';
import { NotificationServiceController } from './controller/notification-service.controller';
import { NotificationServiceService } from './services/notification-service.service';
import { NotificationGateway } from './notification.gateway';
import { MailerModule } from '@nestjs-modules/mailer';
import { RabbitMQModule } from '@app/rabbitmq';
import { SharedModule } from '@app/shared';
import { RedisModule } from '@app/redis';
import { DatabaseModule } from '@app/database';
import { NOTIFICATION_CLIENT, NOTIFICATION_QUEUE } from '@app/common';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: getEnvFilePath() }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        transport: {
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: configService.get('EMAIL_COMPANY'),
            pass: configService.get('EMAIL_PASS_APP'),
          },
        },
        defaults: {
          from: `"${configService.get('NAME_COMPANY')}" <${configService.get('EMAIL_COMPANY')}>`,
        },
      }),
      inject: [ConfigService],
    }),
    SharedModule,
    RedisModule,
    DatabaseModule,
    RabbitMQModule.registerRmq(
      NOTIFICATION_CLIENT,
      NOTIFICATION_QUEUE,
    ),
  ],
  controllers: [NotificationServiceController],
  providers: [NotificationServiceService, NotificationGateway],
})
export class NotificationServiceModule { }