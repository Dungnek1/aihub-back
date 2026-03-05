import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { getEnvFilePath } from '@app/shared';

import { BlogServiceService } from './services/blog-service.service';
import { AnalyticsService } from './services/analytics.service';
import { SharedModule } from '@app/shared';
import { RedisModule } from '@app/redis';
import { DatabaseModule } from '@app/database';
import { RabbitMQModule } from '@app/rabbitmq';
import { BlogServiceController } from './controller/blog-service.controller';
// import { RabbitMQModule } from '../../../libs/rabbitmq/src/rabbitmq.module';
// import { SharedModule } from '../../../libs/shared/src/shared.module';
// import { RedisModule } from '../../../libs/redis/src/redis.module';
// import { DatabaseModule } from '../../../libs/database/src/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: getEnvFilePath() }),
    SharedModule,
    RedisModule,
    DatabaseModule,
    RabbitMQModule.registerRmq('BLOG_CLIENT', 'BLOG_SERVICE_QUEUE'),
    RabbitMQModule.registerRmq('NOTIFICATION_CLIENT', 'NOTIFICATION_SERVICE_QUEUE'),
  ],
  controllers: [BlogServiceController],
  providers: [BlogServiceService, AnalyticsService],
})
export class BlogServiceModule { }
