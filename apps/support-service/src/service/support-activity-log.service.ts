import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from '@app/database';

@Injectable()
export class SupportActivityLogService {
    private readonly logger = new Logger(SupportActivityLogService.name);

    constructor(private readonly prisma: PrismaService) { }

    async getActivityLogs(ticketId: string, query: any) {
        try {
            // Verify ticket exists
            const ticket = await this.prisma.supportTicket.findUnique({
                where: { id: ticketId },
            });

            if (!ticket) {
                throw new RpcException('Ticket not found');
            }

            const page = query.page || 1;
            const limit = query.limit || 20;
            const skip = (page - 1) * limit;

            const where: any = { ticketId };
            if (query.action) where.action = query.action;

            const [logs, total] = await Promise.all([
                this.prisma.supportActivityLog.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                }),
                this.prisma.supportActivityLog.count({ where }),
            ]);

            return {
                data: logs,
                total,
                page,
                limit,
            };
        } catch (error) {
            this.logger.error(`Failed to fetch activity logs: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async getActivityLogById(ticketId: string, logId: string) {
        try {
            const log = await this.prisma.supportActivityLog.findUnique({
                where: { id: logId },
            });

            if (!log || log.ticketId !== ticketId) {
                throw new RpcException('Activity log not found');
            }

            return log;
        } catch (error) {
            this.logger.error(`Failed to fetch activity log: ${error.message}`);
            throw new RpcException(error.message);
        }
    }
}
