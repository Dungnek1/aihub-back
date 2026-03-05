import { Controller, Get } from '@nestjs/common';
import { AdminServiceService } from '../services/admin-service.service';
import { MessagePattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';

function isAckNackable(msg: unknown): msg is {
  ack: (m?: unknown) => void;
  nack: (m?: unknown, allUpTo?: boolean, requeue?: boolean) => void;
} {
  return (
    typeof msg === 'object' && msg !== null && 'ack' in msg && 'nack' in msg
  );
}

@Controller()
export class AdminServiceController {
  constructor(private readonly adminServiceService: AdminServiceService) { }

  @Get()
  getHello(): string {
    return this.adminServiceService.getHello();
  }

  @MessagePattern('admin.getStatistics')
  async handleGetStatistics(
    @Payload() data: { startDate?: string; endDate?: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.adminServiceService.getStatistics(
        data.startDate,
        data.endDate,
      );
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }
}
