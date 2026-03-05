import { PrismaService } from '@app/database';
import { Injectable, HttpException, Inject, Logger } from '@nestjs/common';
import { NotificationType } from '@app/common/constant/enum';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ToolDto } from '../dto/tool.dto';
import { JwtPayload } from '@app/shared/interface.ts/user.interface';

interface GetTopToolsQuery {
  pageNo: number;
  pageSize: number;
  sortBy: string;
  sortType: string;
  status?: number;
  price?: string;
}

@Injectable()
export class ToolServiceService {
  private readonly logger = new Logger(ToolServiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('NOTIFICATION_CLIENT') private readonly notificationClient: ClientProxy,
    @Inject('API_GATEWAY_CLIENT') private readonly apiGatewayClient: ClientProxy,
  ) { }


  async createTool(data: ToolDto, user: JwtPayload): Promise<unknown> {
    try {
      // Generate unique slug
      const baseSlug = data.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      let slug = baseSlug;

      // Check if slug already exists
      const existingTool = await this.prisma.aiTool.findUnique({ where: { slug } });
      if (existingTool) {
        // Count total tools to append to slug
        const totalTools = await this.prisma.aiTool.count();
        slug = `${baseSlug}-${totalTools}`;
      }

      // Create the tool first
      const tool = await this.prisma.aiTool.create({
        data: {
          name: data.name,
          description: data.description,
          logoUrl: data.logoUrl,
          bodyHtml: data.bodyHtml,
          slug: slug,
          priceId: data.priceId,
          createdBy: user.userId,
        }
      });

      // Create tool tags if provided
      if (data.tagIds && data.tagIds.length > 0) {
        const toolTags = data.tagIds.map(tagId => ({
          toolId: tool.id,
          tagId: tagId,
        }));
        await this.prisma.toolTag.createMany({
          data: toolTags,
        });
      }

      // Create tool audiences if provided
      if (data.audienceIds && data.audienceIds.length > 0) {
        const toolAudiences = data.audienceIds.map(audienceId => ({
          toolId: tool.id,
          audienceId: audienceId,
        }));
        await this.prisma.toolAudience.createMany({
          data: toolAudiences,
        });
      }

      // Send notifications to followers asynchronously
      this.sendNewToolNotifications(user.userId, tool).catch((error) => {
        console.error('Failed to send new tool notifications:', error);
      });

      return tool;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Create tool error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Create tool error: ${error}`);
      throw new RpcException('Failed to create tool');
    }
  }

  private async sendNewToolNotifications(creatorId: string, tool: any) {
    // Get tool details for notification context


    if (!tool) return;

    // Get all followers of the creator
    const followers = await this.prisma.follow.findMany({
      where: { followedId: creatorId },
      select: { followerId: true },
    });

    // For each follower, send notification
    for (const follower of followers) {
      await this.notificationClient.emit('notification.create', {
        type: NotificationType.NEW_TOOL,
        actorId: creatorId,
        objectType: 'tool',
        objectId: tool.id,
        recipientId: follower.followerId,
        context: JSON.stringify({ toolName: tool.name }),
      });
    }
  }

  async getTopTools(query: GetTopToolsQuery): Promise<unknown> {
    try {
      const { pageNo, pageSize, sortBy, sortType, status, price } = query;

      const skip = pageNo * pageSize;
      const take = pageSize;

      const orderBy = {
        [sortBy]: sortType === 'desc' ? 'desc' : 'asc',
      };

      // Build where clause
      const where: any = {
        deletedAt: null, // Exclude soft-deleted tools
      };

      // Status filter (if provided)
      if (status !== undefined) {
        where.status = status;
      }

      // Price filter
      if (price) {
        where.price = {
          name: price.toUpperCase(),
        };
      }

      const tools = await this.prisma.aiTool.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          ratings: true,
          tags: { include: { tag: true } },
          price: true,
        },
      });

      const total = await this.prisma.aiTool.count({ where });

      // Transform tools to have tags as arrays of names
      const transformedTools = tools.map(tool => {
        const { seo, createdAt, updatedAt, createdBy, updatedBy, ratings, ...toolData } = tool;
        return {
          ...toolData,
          tags: (tool as any).tags ? (tool as any).tags.map((tt: any) => tt.tag.name) : [],
          price: tool.price.name,
        };
      });

      return {
        tools: transformedTools,
        pagination: {
          pageNo,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Get top tools error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Get top tools error: ${error}`);
      throw new RpcException('Failed to get top tools');
    }
  }

  async createTag(data: { name: string; userId: string }): Promise<unknown> {
    try {
      return this.prisma.tag.create({
        data: {
          name: data.name.toLowerCase().trim(),
          createdBy: data.userId,
          updatedBy: data.userId,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Create tag error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Create tag error: ${error}`);
      throw new RpcException('Failed to create tag');
    }
  }

  async assignTagToTool(data: { toolId: string; tagId: string; userId: string }): Promise<unknown> {
    try {
      const { toolId, tagId, userId } = data;

      // Check if tool exists
      const tool = await this.prisma.aiTool.findUnique({
        where: { id: toolId },
      });

      if (!tool) {
        throw new Error('Tool not found');
      }

      // Check if tag exists
      const tag = await this.prisma.tag.findUnique({
        where: { id: tagId },
      });

      if (!tag) {
        throw new Error('Tag not found');
      }

      // Check if association already exists
      const existingAssociation = await this.prisma.toolTag.findUnique({
        where: {
          toolId_tagId: {
            toolId,
            tagId,
          },
        },
      });

      if (existingAssociation) {
        throw new Error('Tag is already assigned to this tool');
      }

      return this.prisma.toolTag.create({
        data: {
          toolId,
          tagId,
          createdBy: userId,
          updatedBy: userId,
        },
        include: {
          tool: true,
          tag: true,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Assign tag to tool error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Assign tag to tool error: ${error}`);
      throw new RpcException('Failed to assign tag to tool');
    }
  }

  async getTags(pageNo: number = 0, pageSize: number = 10): Promise<unknown> {
    try {
      const skip = pageNo * pageSize;
      const take = pageSize;

      const tags = await this.prisma.tag.findMany({
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
        skip,
        take,
      });

      const total = await this.prisma.tag.count({
        where: { deletedAt: null },
      });

      return {
        tags,
        pagination: {
          pageNo,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Get tags error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Get tags error: ${error}`);
      throw new RpcException('Failed to get tags');
    }
  }

  async searchTags(searchQuery: string, pageNo: number = 0, pageSize: number = 10): Promise<unknown> {
    try {
      const skip = pageNo * pageSize;
      const take = pageSize;

      const where: any = {};

      // Only add search filter if searchQuery is provided and not empty
      if (searchQuery && searchQuery.trim()) {
        where.name = {
          contains: searchQuery.toLowerCase().trim(),
          mode: 'insensitive' as const,
        };
      }

      const tags = await this.prisma.tag.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take,
      });

      const total = await this.prisma.tag.count({ where });

      return {
        tags,
        pagination: {
          pageNo,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Search tags error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Search tags error: ${error}`);
      throw new RpcException('Failed to search tags');
    }
  }

  async rateTool(toolId: string, userId: string, stars: number): Promise<unknown> {
    try {
      if (stars < 0 || stars > 5) {
        throw new Error('Rating must be between 0 and 5 stars');
      }

      const tool = await this.prisma.aiTool.findUnique({
        where: { id: toolId },
        select: {
          id: true,
          name: true,
          avgRating: true,
          ratingsCount: true,
          createdBy: true // Lấy thông tin creator
        },
      });

      if (!tool) {
        throw new Error('Tool not found');
      }

      const user = await this.prisma.user.findUnique({
        where: { userId },
        select: { userId: true, name: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Create new rating
      const rating = await this.prisma.toolRating.create({
        data: {
          toolId,
          userId,
          stars,
          createdBy: userId,
          updatedBy: userId,
        },
        include: {
          tool: true,
          user: true,
        },
      });

      const newRatingsCount = tool.ratingsCount + 1;

      const newAvgRating = ((Number(tool.avgRating) * tool.ratingsCount) + stars) / newRatingsCount;

      const updatedTool = await this.prisma.aiTool.update({
        where: { id: toolId },
        data: {
          avgRating: newAvgRating,
          ratingsCount: newRatingsCount,
          updatedAt: new Date(),
          updatedBy: userId,
        },
      });

      // Gửi notification cho admin (người tạo tool)
      if (tool.createdBy && tool.createdBy !== userId) { // Không gửi cho chính người đánh giá
        await this.notificationClient.emit('notification.create', {
          type: NotificationType.TOOL_RATED,
          actorId: userId,
          objectType: 'tool',
          objectId: tool.id,
          recipientId: tool.createdBy,
          context: JSON.stringify({
            toolName: tool.name,
            stars: stars,
            raterName: user.name,
            newAvgRating: Number(newAvgRating.toFixed(2))
          }),
        });
      }

      // Gửi notification cho người đánh giá để cập nhật giao diện
      await this.notificationClient.emit('notification.create', {
        type: NotificationType.TOOL_RATED,
        actorId: userId,
        objectType: 'tool',
        objectId: tool.id,
        recipientId: userId,
        context: JSON.stringify({
          toolName: tool.name,
          stars: stars,
          raterName: user.name,
          newAvgRating: Number(newAvgRating.toFixed(2)),
          isOwnRating: true // Đánh dấu đây là rating của chính mình
        }),
      });



      return {
        rating,
        avgRating: Number((updatedTool.avgRating || 0).toFixed(2)),
        ratingsCount: updatedTool.ratingsCount,
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Rate tool error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Rate tool error: ${error}`);
      throw new RpcException('Failed to rate tool');
    }
  }

  async markToolAsUsed(userId: string, toolId: string): Promise<unknown> {
    try {
      // Check if tool exists
      const tool = await this.prisma.aiTool.findUnique({
        where: { id: toolId },
      });

      if (!tool) {
        throw new Error('Tool not found');
      }

      // Check if usage record already exists
      const existingUsage = await this.prisma.userToolUsage.findUnique({
        where: {
          userId_toolId: {
            userId,
            toolId,
          },
        },
      });

      if (existingUsage) {
        // Update existing record
        return this.prisma.userToolUsage.update({
          where: {
            userId_toolId: {
              userId,
              toolId,
            },
          },
          data: {
            lastUsedAt: new Date(),
            usageCount: { increment: 1 },
            updatedBy: userId,
          },
        });
      } else {
        // Create new record
        return this.prisma.userToolUsage.create({
          data: {
            userId,
            toolId,
            createdBy: userId,
            updatedBy: userId,
          },
        });
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Mark tool as used error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Mark tool as used error: ${error}`);
      throw new RpcException('Failed to mark tool as used');
    }
  }

  async toggleSaveTool(userId: string, toolId: string): Promise<unknown> {
    try {
      // Check if tool exists
      const tool = await this.prisma.aiTool.findUnique({
        where: { id: toolId },
      });

      if (!tool) {
        throw new Error('Tool not found');
      }

      // Check if already saved
      const existingSave = await this.prisma.userSavedTool.findUnique({
        where: {
          userId_toolId: {
            userId,
            toolId,
          },
        },
      });

      if (existingSave) {
        // Remove from saved
        await this.prisma.userSavedTool.delete({
          where: {
            userId_toolId: {
              userId,
              toolId,
            },
          },
        });
        return { action: 'unsaved', message: 'Tool removed from saved tools' };
      } else {
        // Add to saved
        return this.prisma.userSavedTool.create({
          data: {
            userId,
            toolId,
            createdBy: userId,
            updatedBy: userId,
          },
          include: {
            tool: true,
          },
        });
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Toggle save tool error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Toggle save tool error: ${error}`);
      throw new RpcException('Failed to toggle save tool');
    }
  }

  async getUserUsedTools(userId: string, pageNo: number = 0, pageSize: number = 10): Promise<unknown> {
    try {
      const skip = pageNo * pageSize;
      const take = pageSize;

      const usages = await this.prisma.userToolUsage.findMany({
        where: {
          userId,
          tool: {
            deletedAt: null, // Exclude soft-deleted tools
          },
        },
        orderBy: { lastUsedAt: 'desc' },
        skip,
        take,
        include: {
          tool: {
            include: {
              tags: { include: { tag: true } },
              audiences: { include: { audience: true } },
              price: true,
            },
          },
        },
      });

      const total = await this.prisma.userToolUsage.count({
        where: {
          userId,
          tool: {
            deletedAt: null,
          },
        },
      });

      // Transform tools to have tags and audiences as arrays of names
      const transformedTools = usages.map(usage => {
        const { seo, createdAt, updatedAt, createdBy, updatedBy, ...toolData } = usage.tool;
        return {
          ...toolData,
          tags: usage.tool.tags.map(tt => tt.tag.name),
          audiences: usage.tool.audiences.map(ta => ta.audience.name),
          price: usage.tool.price.name,
        };
      });

      return {
        tools: transformedTools,
        pagination: {
          pageNo,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Get user used tools error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Get user used tools error: ${error}`);
      throw new RpcException('Failed to get user used tools');
    }
  }

  async getUserSavedTools(userId: string, pageNo: number = 0, pageSize: number = 10): Promise<unknown> {
    try {
      const skip = pageNo * pageSize;
      const take = pageSize;

      const saved = await this.prisma.userSavedTool.findMany({
        where: {
          userId,
          tool: {
            deletedAt: null, // Exclude soft-deleted tools
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          tool: {
            include: {
              tags: { include: { tag: true } },
              audiences: { include: { audience: true } },
              price: true,
            },
          },
        },
      });

      const total = await this.prisma.userSavedTool.count({
        where: {
          userId,
          tool: {
            deletedAt: null,
          },
        },
      });

      // Transform tools to have tags and audiences as arrays of names
      const transformedTools = saved.map(save => {
        const { seo, createdAt, updatedAt, createdBy, updatedBy, ...toolData } = save.tool;
        return {
          ...toolData,
          tags: save.tool.tags.map(tt => tt.tag.name),
          audiences: save.tool.audiences.map(ta => ta.audience.name),
          price: save.tool.price.name,
        };
      });

      return {
        tools: transformedTools,
        pagination: {
          pageNo,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Get user saved tools error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Get user saved tools error: ${error}`);
      throw new RpcException('Failed to get user saved tools');
    }
  }

  async getToolDetail(slug: string): Promise<unknown> {
    try {
      const tool = await this.prisma.aiTool.findUnique({
        where: { slug: slug },
        include: {
          tags: { include: { tag: true } },
          audiences: { include: { audience: true } },
          price: true,
        },
      });

      if (!tool) throw new Error('Tool not found');

      // Check if tool is soft-deleted
      if (tool.deletedAt !== null) {
        throw new Error('Tool not found');
      }

      // Transform tags and audiences to arrays of names
      const { seo, createdAt, updatedAt, createdBy, updatedBy, ...toolData } = tool;
      const transformedTool = {
        ...toolData,
        tags: tool.tags.map(tt => tt.tag.name),
        audiences: tool.audiences.map(ta => ta.audience.name),
        price: tool.price.name,
        avgRating: tool.avgRating ? Number(tool.avgRating) : 0,
        ratingsCount: tool.ratingsCount,
      };

      return transformedTool;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Get tool detail error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Get tool detail error: ${error}`);
      throw new RpcException('Failed to get tool detail');
    }
  }

  async getToolById(toolId: string): Promise<unknown> {
    try {
      const tool = await this.prisma.aiTool.findUnique({
        where: { id: toolId },
      });

      if (!tool) throw new Error('Tool not found');

      return tool;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Get tool by ID error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Get tool by ID error: ${error}`);
      throw new RpcException('Failed to get tool');
    }
  }

  async filterTools(query: {
    pageNo: number;
    pageSize: number;
    sortBy: string;
    sortType: string;
    status?: number;
    price?: string;
    audience?: string;
  }): Promise<unknown> {
    try {
      const { pageNo, pageSize, sortBy, sortType, status, price, audience } = query;

      const skip = pageNo * pageSize;
      const take = pageSize;

      const orderBy = {
        [sortBy]: sortType === 'desc' ? 'desc' : 'asc',
      };

      // Build where clause
      const where: any = {
        deletedAt: null, // Exclude soft-deleted tools
      };

      // Status filter (if provided)
      if (status !== undefined) {
        where.status = status;
      }

      // Price filter
      if (price) {
        where.price = {
          name: price.toUpperCase(),
        };
      }

      // Audience filter
      if (audience) {
        where.audiences = {
          some: {
            audience: {
              name: audience,
            },
          },
        };
      }

      const tools = await this.prisma.aiTool.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          tags: { include: { tag: true } },
          audiences: { include: { audience: true } },
          price: true,
        },
      });

      const total = await this.prisma.aiTool.count({ where });

      // Transform tools to have tags and audiences as arrays of names
      const transformedTools = tools.map(tool => {
        const { seo, createdAt, updatedAt, priceId, createdBy, updatedBy, ...toolData } = tool;
        return {
          ...toolData,
          tags: tool.tags.map(tt => tt.tag.name),
          audiences: tool.audiences.map(ta => ta.audience.name),
          price: tool.price.name,
        };
      });

      return {
        tools: transformedTools,
        pagination: {
          pageNo,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Filter tools error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Filter tools error: ${error}`);
      throw new RpcException('Failed to filter tools');
    }
  }

  async createAudience(data: { name: string; userId: string }): Promise<unknown> {
    try {
      return this.prisma.audience.create({
        data: {
          name: data.name.toLowerCase().trim(),
          createdBy: data.userId,
          updatedBy: data.userId,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Create audience error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Create audience error: ${error}`);
      throw new RpcException('Failed to create audience');
    }
  }

  async getAudiences(): Promise<unknown> {
    try {
      return this.prisma.audience.findMany({
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Get audiences error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Get audiences error: ${error}`);
      throw new RpcException('Failed to get audiences');
    }
  }

  async assignAudienceToTool(data: { toolId: string; audienceId: string; userId: string }): Promise<unknown> {
    try {
      const { toolId, audienceId, userId } = data;

      // Check if tool exists
      const tool = await this.prisma.aiTool.findUnique({
        where: { id: toolId },
      });

      if (!tool) {
        throw new Error('Tool not found');
      }

      // Check if audience exists
      const audience = await this.prisma.audience.findUnique({
        where: { id: audienceId },
      });

      if (!audience) {
        throw new Error('Audience not found');
      }

      // Check if association already exists
      const existingAssociation = await this.prisma.toolAudience.findUnique({
        where: {
          toolId_audienceId: {
            toolId,
            audienceId,
          },
        },
      });

      if (existingAssociation) {
        throw new Error('Audience is already assigned to this tool');
      }

      return this.prisma.toolAudience.create({
        data: {
          toolId,
          audienceId,
          createdBy: userId,
          updatedBy: userId,
        },
        include: {
          tool: true,
          audience: true,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Assign audience to tool error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Assign audience to tool error: ${error}`);
      throw new RpcException('Failed to assign audience to tool');
    }
  }

  async removeToolUsage(userId: string, toolId: string): Promise<unknown> {
    try {
      // Check if tool exists
      const tool = await this.prisma.aiTool.findUnique({
        where: { id: toolId },
      });

      if (!tool) {
        throw new Error('Tool not found');
      }

      // Check if usage record exists
      const existingUsage = await this.prisma.userToolUsage.findUnique({
        where: {
          userId_toolId: {
            userId,
            toolId,
          },
        },
      });

      if (!existingUsage) {
        throw new Error('Tool usage record not found');
      }

      // Delete the usage record
      await this.prisma.userToolUsage.delete({
        where: {
          userId_toolId: {
            userId,
            toolId,
          },
        },
      });

      return { message: 'Tool usage record removed successfully' };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Remove tool usage error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Remove tool usage error: ${error}`);
      throw new RpcException('Failed to remove tool usage');
    }
  }

  async removeSavedTool(userId: string, toolId: string): Promise<unknown> {
    try {
      // Check if tool exists
      const tool = await this.prisma.aiTool.findUnique({
        where: { id: toolId },
      });

      if (!tool) {
        throw new Error('Tool not found');
      }

      // Check if saved record exists
      const existingSave = await this.prisma.userSavedTool.findUnique({
        where: {
          userId_toolId: {
            userId,
            toolId,
          },
        },
      });

      if (!existingSave) {
        throw new Error('Saved tool record not found');
      }

      // Delete the saved record
      await this.prisma.userSavedTool.delete({
        where: {
          userId_toolId: {
            userId,
            toolId,
          },
        },
      });

      return { message: 'Saved tool removed successfully' };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Remove saved tool error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Remove saved tool error: ${error}`);
      throw new RpcException('Failed to remove saved tool');
    }
  }

  async createPrice(data: { name: string; userId: string }): Promise<unknown> {
    try {
      // Check if price name already exists
      const existingPrice = await this.prisma.price.findUnique({
        where: { name: data.name.toUpperCase() },
      });

      if (existingPrice) {
        throw new Error('Price name already exists');
      }

      return this.prisma.price.create({
        data: {
          name: data.name,
          createdBy: data.userId,
          updatedBy: data.userId,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Create price error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Create price error: ${error}`);
      throw new RpcException('Failed to create price');
    }
  }

  async updateToolPrice(data: { toolId: string; priceId: string; userId: string }): Promise<unknown> {
    try {
      const { toolId, priceId, userId } = data;

      // Check if tool exists
      const tool = await this.prisma.aiTool.findUnique({
        where: { id: toolId },
      });

      if (!tool) {
        throw new Error('Tool not found');
      }

      // Check if price exists
      const price = await this.prisma.price.findUnique({
        where: { id: priceId },
      });

      if (!price) {
        throw new Error('Price not found');
      }

      return this.prisma.aiTool.update({
        where: { id: toolId },
        data: {
          priceId,
          updatedAt: new Date(),
          updatedBy: userId,
        },
        include: {
          price: true,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Update tool price error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Update tool price error: ${error}`);
      throw new RpcException('Failed to update tool price');
    }
  }

  async getAllPrices(): Promise<unknown> {
    try {
      return this.prisma.price.findMany({
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Get all prices error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Get all prices error: ${error}`);
      throw new RpcException('Failed to get prices');
    }
  }

  async getToolRatingStats(toolId: string): Promise<unknown> {
    try {
      // Check if tool exists
      const tool = await this.prisma.aiTool.findUnique({
        where: { id: toolId },
        select: {
          id: true,
          name: true,
          avgRating: true,
          ratingsCount: true,
        },
      });

      if (!tool) {
        throw new Error('Tool not found');
      }

      // Get all ratings for the tool
      const ratings = await this.prisma.toolRating.findMany({
        where: { toolId },
        select: { stars: true },
      });

      // Count ratings by stars
      const ratingStats = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      };

      ratings.forEach(rating => {
        if (rating.stars >= 1 && rating.stars <= 5) {
          ratingStats[rating.stars as keyof typeof ratingStats]++;
        }
      });

      return {
        toolId: tool.id,
        toolName: tool.name,
        avgRating: tool.avgRating ? Number(tool.avgRating) : 0,
        totalRatings: tool.ratingsCount,
        ratingDistribution: {
          oneStar: ratingStats[1],
          twoStars: ratingStats[2],
          threeStars: ratingStats[3],
          fourStars: ratingStats[4],
          fiveStars: ratingStats[5],
        },
        percentages: {
          oneStar: tool.ratingsCount > 0 ? ((ratingStats[1] / tool.ratingsCount) * 100).toFixed(1) : '0.0',
          twoStars: tool.ratingsCount > 0 ? ((ratingStats[2] / tool.ratingsCount) * 100).toFixed(1) : '0.0',
          threeStars: tool.ratingsCount > 0 ? ((ratingStats[3] / tool.ratingsCount) * 100).toFixed(1) : '0.0',
          fourStars: tool.ratingsCount > 0 ? ((ratingStats[4] / tool.ratingsCount) * 100).toFixed(1) : '0.0',
          fiveStars: tool.ratingsCount > 0 ? ((ratingStats[5] / tool.ratingsCount) * 100).toFixed(1) : '0.0',
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Get tool rating stats error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Get tool rating stats error: ${error}`);
      throw new RpcException('Failed to get tool rating stats');
    }
  }

  // ===== ADMIN METHODS =====

  async getToolsAdmin(query: {
    pageNo?: number;
    pageSize?: number;
    search?: string;
    status?: number;
  }): Promise<{
    tools: any[];
    pagination: {
      pageNo: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }> {
    const pageNo = query.pageNo || 0;
    const pageSize = query.pageSize || 20;
    const { search, status } = query;

    const where: any = {
      deletedAt: null, // Exclude soft-deleted tools in admin list
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status !== undefined) {
      where.status = status;
    }

    const [tools, total] = await Promise.all([
      this.prisma.aiTool.findMany({
        where,
        include: {
          price: true,
          tags: { include: { tag: true } },
          _count: {
            select: { ratings: true },
          },
        },
        skip: pageNo * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aiTool.count({ where }),
    ]);

    const transformedTools = tools.map(tool => {
      const { seo, createdBy, updatedBy, deletedAt, deletedBy, ...toolData } = tool;
      return {
        ...toolData,
        createdAt: tool.createdAt,
        updatedAt: tool.updatedAt,
        tags: tool.tags.map(tt => tt.tag.name),
        price: tool.price?.name || 'N/A',
        ratingsCount: tool._count.ratings,
        avgRating: tool.avgRating && tool.ratingsCount > 0 
          ? Number(tool.avgRating) 
          : 5,
      };
    });

    return {
      tools: transformedTools,
      pagination: {
        pageNo,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getToolAdmin(toolId: string): Promise<any> {
    const tool = await this.prisma.aiTool.findUnique({
      where: { id: toolId },
      include: {
        price: true,
        tags: { include: { tag: true } },
        audiences: { include: { audience: true } },
        _count: {
          select: { ratings: true, usages: true, savedTools: true },
        },
      },
    });

    if (!tool) {
      throw new RpcException('Tool not found');
    }

    return {
      ...tool,
      ratingsCount: tool._count.ratings,
      useCount: tool._count.usages,
      savedCount: tool._count.savedTools,
    };
  }

  async updateToolAdmin(toolId: string, data: any): Promise<any> {
    const tool = await this.prisma.aiTool.findUnique({
      where: { id: toolId },
    });

    if (!tool) {
      throw new RpcException('Tool not found');
    }

    // Extract updatedBy from data to set it explicitly
    const { updatedBy, ...updateData } = data;

    const updatedTool = await this.prisma.aiTool.update({
      where: { id: toolId },
      data: {
        ...updateData,
        updatedBy: updatedBy || tool.updatedBy, // Keep updatedBy if provided
        updatedAt: new Date(), // Explicitly set updatedAt
      },
      include: {
        price: true,
        tags: { include: { tag: true } },
        audiences: { include: { audience: true } },
      },
    });

    this.logger.log(`Tool ${toolId} updated by ${updatedBy}`);
    return updatedTool;
  }

  async deleteToolAdmin(toolId: string, deletedBy?: string): Promise<void> {
    const tool = await this.prisma.aiTool.findUnique({
      where: { id: toolId },
    });

    if (!tool) {
      throw new RpcException('Tool not found');
    }

    // Soft delete: set deletedAt and deletedBy
    await this.prisma.aiTool.update({
      where: { id: toolId },
      data: {
        deletedAt: new Date(),
        deletedBy: deletedBy,
      },
    });

    this.logger.log(`Tool ${toolId} soft deleted by ${deletedBy}`);
  }

  // ===== TAG UPDATE/DELETE =====

  async updateTag(data: { id: string; name: string; userId: string }): Promise<unknown> {
    try {
      const { id, name, userId } = data;

      // Check if tag exists
      const tag = await this.prisma.tag.findUnique({
        where: { id },
      });

      if (!tag) {
        throw new Error('Tag not found');
      }

      // Check if name already exists (excluding current tag)
      const existingTag = await this.prisma.tag.findFirst({
        where: {
          name: name.toLowerCase().trim(),
          NOT: { id },
        },
      });

      if (existingTag) {
        throw new Error('Tag name already exists');
      }

      return this.prisma.tag.update({
        where: { id },
        data: {
          name: name.toLowerCase().trim(),
          updatedBy: userId,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Update tag error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Update tag error: ${error}`);
      throw new RpcException('Failed to update tag');
    }
  }

  async deleteTag(data: { id: string; userId: string }): Promise<unknown> {
    try {
      const { id, userId } = data;

      // Check if tag exists
      const tag = await this.prisma.tag.findUnique({
        where: { id },
      });

      if (!tag) {
        throw new Error('Tag not found');
      }

      // Soft delete: set deletedAt and deletedBy
      await this.prisma.tag.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedBy: userId,
        },
      });

      this.logger.log(`Tag ${id} soft deleted by ${userId}`);
      return { success: true };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Delete tag error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Delete tag error: ${error}`);
      throw new RpcException('Failed to delete tag');
    }
  }

  // ===== PRICE UPDATE/DELETE =====

  async updatePrice(data: { id: string; name: string; userId: string }): Promise<unknown> {
    try {
      const { id, name, userId } = data;

      // Check if price exists
      const price = await this.prisma.price.findUnique({
        where: { id },
      });

      if (!price) {
        throw new Error('Price not found');
      }

      // Check if name already exists (excluding current price)
      const existingPrice = await this.prisma.price.findFirst({
        where: {
          name,
          NOT: { id },
        },
      });

      if (existingPrice) {
        throw new Error('Price name already exists');
      }

      return this.prisma.price.update({
        where: { id },
        data: {
          name,
          updatedBy: userId,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Update price error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Update price error: ${error}`);
      throw new RpcException('Failed to update price');
    }
  }

  async deletePrice(data: { id: string; userId: string }): Promise<unknown> {
    try {
      const { id, userId } = data;

      // Check if price exists
      const price = await this.prisma.price.findUnique({
        where: { id },
      });

      if (!price) {
        throw new Error('Price not found');
      }

      // Soft delete: set deletedAt and deletedBy
      await this.prisma.price.update({
        where: { id },
        data: {
          //@ts-ignore
          deletedAt: new Date(),
          deletedBy: userId,
        },
      });

      this.logger.log(`Price ${id} soft deleted by ${userId}`);
      return { success: true };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Delete price error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Delete price error: ${error}`);
      throw new RpcException('Failed to delete price');
    }
  }

  // ===== AUDIENCE UPDATE/DELETE =====

  async updateAudience(data: { id: string; name: string; userId: string }): Promise<unknown> {
    try {
      const { id, name, userId } = data;

      // Check if audience exists
      const audience = await this.prisma.audience.findUnique({
        where: { id },
      });

      if (!audience) {
        throw new Error('Audience not found');
      }

      // Check if name already exists (excluding current audience)
      const existingAudience = await this.prisma.audience.findFirst({
        where: {
          name: name.toLowerCase().trim(),
          NOT: { id },
        },
      });

      if (existingAudience) {
        throw new Error('Audience name already exists');
      }

      return this.prisma.audience.update({
        where: { id },
        data: {
          name: name.toLowerCase().trim(),
          updatedBy: userId,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Update audience error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Update audience error: ${error}`);
      throw new RpcException('Failed to update audience');
    }
  }

  async deleteAudience(data: { id: string; userId: string }): Promise<unknown> {
    try {
      const { id, userId } = data;

      // Check if audience exists
      const audience = await this.prisma.audience.findUnique({
        where: { id },
      });

      if (!audience) {
        throw new Error('Audience not found');
      }

      // Soft delete: set deletedAt and deletedBy
      await this.prisma.audience.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedBy: userId,
        },
      });

      this.logger.log(`Audience ${id} soft deleted by ${userId}`);
      return { success: true };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Delete audience error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Delete audience error: ${error}`);
      throw new RpcException('Failed to delete audience');
    }
  }

  getHello(): string {
    return 'Hello World!';
  }
}
