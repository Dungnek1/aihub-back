import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { getEnvFilePath } from '@app/shared';
import { AdminServiceController } from './controller/admin-service.controller';
import { AdminServiceService } from './services/admin-service.service';
import { DatabaseModule } from '@app/database';
import { SharedModule } from '@app/shared';
import { RedisModule } from '@app/redis';
import { RabbitMQModule } from '@app/rabbitmq';
// import { RabbitMQModule } from '../../../libs/rabbitmq/src/rabbitmq.module';
// import { SharedModule } from '../../../libs/shared/src/shared.module';
// import { DatabaseModule } from '../../../libs/database/src/database.module';
// import { RedisModule } from '../../../libs/redis/src/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: getEnvFilePath() }),
    DatabaseModule,
    SharedModule,
    RedisModule,
    RabbitMQModule.registerRmq('ADMIN_CLIENT', 'ADMIN_SERVICE_QUEUE'),
  ],
  controllers: [AdminServiceController],
  providers: [AdminServiceService],
})
export class AdminServiceModule { }
