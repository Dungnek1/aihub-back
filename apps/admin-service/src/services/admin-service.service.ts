import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class AdminServiceService {
  private readonly logger = new Logger(AdminServiceService.name);

  constructor(private readonly prisma: PrismaService) { }

  /**
   * Get statistics for posts, tools, and users within a date range
   */
  async getStatistics(startDate?: string, endDate?: string) {
    try {
      // Parse dates - if not provided, use default range
      let start: Date;
      let end: Date;

      if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
      } else {
        // Default: this year to today
        const today = new Date();
        start = new Date(today.getFullYear(), 0, 1); // Jan 1 of current year
        end = new Date(today.getFullYear(), 11, 31, 23, 59, 59); // Dec 31 of current year
      }

      // Ensure start is before end
      if (start > end) {
        throw new Error('startDate must be before endDate');
      }

      // Count published posts created within date range
      const postsCount = await this.prisma.post.count({
        where: {
          content: {
            createdAt: {
              gte: start,
              lte: end,
            },
          },
        },
      });

      // Count AI tools created within date range
      const toolsCount = await this.prisma.aiTool.count({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
        },
      });

      // Count users created within date range (excluding banned users)
      const usersCount = await this.prisma.user.count({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },

        },
      });

      this.logger.log(
        `Statistics retrieved - Posts: ${postsCount}, Tools: ${toolsCount}, Users: ${usersCount}`,
      );

      return {
        postsCount,
        toolsCount,
        usersCount,
        period: {
          startDate: start.toISOString().split('T')[0], // YYYY-MM-DD
          endDate: end.toISOString().split('T')[0], // YYYY-MM-DD
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Get statistics error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Get statistics error: ${error}`);
      throw new RpcException('Failed to get statistics');
    }
  }

  getHello(): string {
    return 'Hello World!';
  }
}
