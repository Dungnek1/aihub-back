import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { getEnvFilePath } from '@app/shared';
import { ToolMarketingService } from './service/tool-marketing.service';
import { ToolMarketingRatingService } from './service/tool-marketing-rating.service';
import { ToolMarketingServiceController } from './controller/tool-marketing-service.controller';
import { DatabaseModule } from '@app/database';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: getEnvFilePath() }), DatabaseModule],
  controllers: [ToolMarketingServiceController],
  providers: [ToolMarketingService, ToolMarketingRatingService],
})
export class ToolMarketingServiceModule { }

