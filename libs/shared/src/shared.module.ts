import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedService } from './shared.service';
import { RabbitMQService } from './rmq.service';

@Global()
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [SharedService, RabbitMQService],
  exports: [SharedService, RabbitMQService],
})
export class SharedModule {}
