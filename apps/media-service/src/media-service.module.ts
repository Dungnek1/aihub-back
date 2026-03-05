import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { getEnvFilePath } from '@app/shared';
import { MulterModule } from '@nestjs/platform-express';
import { MediaServiceController } from './controller/media-service.controller';
import { MediaServiceService } from './services/media-service.service';

import { DatabaseModule } from '@app/database';
import { RabbitMQModule } from '@app/rabbitmq';
import { SharedModule } from '@app/shared';
import { MulterConfigService } from '@app/shared/multer.config';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: getEnvFilePath()
    }),
    MulterModule.registerAsync({
      useClass: MulterConfigService,
    }),
    DatabaseModule,
    SharedModule,
    RabbitMQModule.registerRmq('MEDIA_CLIENT', 'MEDIA_SERVICE_QUEUE'),
  ],
  controllers: [MediaServiceController],
  providers: [MediaServiceService, MulterConfigService],
})
export class MediaServiceModule { }
