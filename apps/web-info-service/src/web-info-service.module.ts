import { Module } from '@nestjs/common';
import { WebInfoServiceController } from './controller/web-info-service.controller';
import { WebInfoServiceService } from './service/web-info-service.service';


@Module({
  imports: [],
  controllers: [WebInfoServiceController],
  providers: [WebInfoServiceService],
})
export class WebInfoServiceModule { }
