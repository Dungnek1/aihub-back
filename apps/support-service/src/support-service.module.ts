import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { getEnvFilePath } from '@app/shared';
import { DatabaseModule } from '@app/database';
import { RabbitMQModule } from '@app/rabbitmq';

import { SupportServiceController } from './controller/support-service.controller';
import { SupportAgentService } from './service/support-agent.service';
import { SupportTicketService } from './service/support-ticket.service';
import { SupportMessageService } from './service/support-message.service';
import { SupportRatingService } from './service/support-rating.service';
import { SupportCategoryService } from './service/support-category.service';
import { SupportActivityLogService } from './service/support-activity-log.service';
import { SupportContactRequestService } from './service/support-contact-request.service';
import { SupportContactInfoService } from './service/support-contact-info.service';
import { NewsletterSubscriptionService } from './service/newsletter-subscription.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: getEnvFilePath(),
    }),
    DatabaseModule,
    RabbitMQModule.registerRmq('SUPPORT_CLIENT', 'SUPPORT_SERVICE_QUEUE'),
  ],
  controllers: [SupportServiceController],
  providers: [
    SupportAgentService,
    SupportTicketService,
    SupportMessageService,
    SupportRatingService,
    SupportCategoryService,
    SupportActivityLogService,
    SupportContactRequestService,
    SupportContactInfoService,
    NewsletterSubscriptionService,
  ],
})
export class SupportServiceModule { }
