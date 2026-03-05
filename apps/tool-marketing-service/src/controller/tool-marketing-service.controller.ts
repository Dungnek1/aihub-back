import { Controller, NotFoundException } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { ToolMarketingService } from '../service/tool-marketing.service';
import { ToolMarketingRatingService } from '../service/tool-marketing-rating.service';
import { CreateToolMarketingDto, UpdateToolMarketingDto, CreateToolMarketingRatingDto } from '../dto/tool-marketing.dto';

@Controller()
export class ToolMarketingServiceController {
  constructor(
    private readonly toolMarketingService: ToolMarketingService,
    private readonly ratingService: ToolMarketingRatingService,
  ) { }

  // ===== TOOL MARKETING PATTERNS =====

  @MessagePattern('toolMarketing.create')
  async createToolMarketing(@Payload() data: CreateToolMarketingDto) {
    return this.toolMarketingService.createToolMarketing(data);
  }

  @MessagePattern('toolMarketing.getAll')
  async getAllToolMarketings(@Payload() data: { skip: number; take: number; status?: string; isFeatured?: boolean }) {
    return this.toolMarketingService.getAllToolMarketings(data.skip, data.take, data.status, data.isFeatured);
  }

  @MessagePattern('toolMarketing.getById')
  async getToolMarketingById(@Payload() data: { id: string }) {
    try {
      return await this.toolMarketingService.getToolMarketingById(data.id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new RpcException({ statusCode: 404, message: error.message });
      }
      throw error;
    }
  }

  @MessagePattern('toolMarketing.getBySlug')
  async getToolMarketingBySlug(@Payload() data: { slug: string }) {
    try {
      return await this.toolMarketingService.getToolMarketingBySlug(data.slug);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new RpcException({ statusCode: 404, message: error.message });
      }
      throw error;
    }
  }

  @MessagePattern('toolMarketing.update')
  async updateToolMarketing(@Payload() data: any) {
    const { id, ...updateData } = data;
    return this.toolMarketingService.updateToolMarketing(id, updateData);
  }

  @MessagePattern('toolMarketing.delete')
  async deleteToolMarketing(@Payload() data: { id: string; deletedBy: string }) {
    return this.toolMarketingService.deleteToolMarketing(data.id, data.deletedBy);
  }

  @MessagePattern('toolMarketing.publish')
  async publishToolMarketing(@Payload() data: { id: string; status: string; updatedBy: string }) {
    return this.toolMarketingService.publishToolMarketing(data.id, data.updatedBy);
  }

  @MessagePattern('toolMarketing.getByInstructor')
  async getToolMarketingsByInstructor(@Payload() data: { instructorId: string; skip: number; take: number }) {
    return this.toolMarketingService.getToolMarketingsByInstructor(data.instructorId, data.skip, data.take);
  }

  @MessagePattern('toolMarketing.incrementView')
  async incrementToolMarketingView(@Payload() data: { id: string }) {
    return this.toolMarketingService.incrementToolMarketingView(data.id);
  }

  @MessagePattern('toolMarketing.getFeatured')
  async getFeaturedToolMarketings(@Payload() data: { limit?: number }) {
    return this.toolMarketingService.getFeaturedToolMarketings(data.limit || 4);
  }

  @MessagePattern('toolMarketing.count')
  async countToolMarketings() {
    return this.toolMarketingService.count();
  }

  // ===== TOOL MARKETING RATING PATTERNS =====

  @MessagePattern('toolMarketing.rate')
  async rateToolMarketing(@Payload() data: any) {
    const { toolMarketingId, userId, createdBy, ...ratingData } = data;
    return this.ratingService.createRating(toolMarketingId, userId, ratingData, createdBy);
  }

  @MessagePattern('toolMarketing.rating.update')
  async updateRating(@Payload() data: any) {
    const { id, userId, updatedBy, ...ratingData } = data;
    return this.ratingService.updateRating(id, userId, ratingData, updatedBy);
  }

  @MessagePattern('toolMarketing.rating.delete')
  async deleteRating(@Payload() data: { id: string; userId: string; deletedBy: string }) {
    return this.ratingService.deleteRating(data.id, data.userId, data.deletedBy);
  }

  @MessagePattern('toolMarketing.getRatings')
  async getToolMarketingRatings(@Payload() data: { toolMarketingId: string; skip: number; take: number }) {
    return this.ratingService.getToolMarketingRatings(data.toolMarketingId, data.skip, data.take);
  }

  @MessagePattern('toolMarketing.getAverageRating')
  async getAverageRating(@Payload() data: { toolMarketingId: string }) {
    return this.ratingService.getAverageRating(data.toolMarketingId);
  }

  @MessagePattern('toolMarketing.use')
  async markToolMarketingAsUsed(@Payload() data: { userId: string; toolMarketingId: string }) {
    return this.toolMarketingService.markToolMarketingAsUsed(data.userId, data.toolMarketingId);
  }

  @MessagePattern('toolMarketing.save')
  async toggleSaveToolMarketing(@Payload() data: { userId: string; toolMarketingId: string }) {
    return this.toolMarketingService.toggleSaveToolMarketing(data.userId, data.toolMarketingId);
  }

  @MessagePattern('toolMarketing.get-used')
  async getUserUsedToolMarketings(@Payload() data: { userId: string; pageNo?: number; pageSize?: number }) {
    return this.toolMarketingService.getUserUsedToolMarketings(data.userId, data.pageNo, data.pageSize);
  }

  @MessagePattern('toolMarketing.get-saved')
  async getUserSavedToolMarketings(@Payload() data: { userId: string; pageNo?: number; pageSize?: number }) {
    return this.toolMarketingService.getUserSavedToolMarketings(data.userId, data.pageNo, data.pageSize);
  }

  @MessagePattern('admin.getToolMarketings')
  async getToolMarketingsAdmin(@Payload() data: { pageNo?: number; pageSize?: number; search?: string; status?: string }) {
    return this.toolMarketingService.getToolMarketingsAdmin(data);
  }

  @MessagePattern('admin.getToolMarketing')
  async getToolMarketingAdmin(@Payload() data: { id: string }) {
    try {
      return await this.toolMarketingService.getToolMarketingAdmin(data.id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new RpcException({ statusCode: 404, message: error.message });
      }
      throw error;
    }
  }

  @MessagePattern('admin.updateToolMarketing')
  async updateToolMarketingAdmin(@Payload() data: { id: string; updatedBy: string; [key: string]: any }) {
    try {
      const { id, updatedBy, ...updateData } = data;
      console.log('[ToolMarketingController] Updating tool marketing:', id);
      console.log('[ToolMarketingController] Update data:', JSON.stringify(updateData, null, 2));
      return await this.toolMarketingService.updateToolMarketing(id, { ...updateData, updatedBy });
    } catch (error) {
      console.error('[ToolMarketingController] Error updating tool marketing:', error);
      console.error('[ToolMarketingController] Error stack:', error?.stack);
      console.error('[ToolMarketingController] Error code:', error?.code);
      console.error('[ToolMarketingController] Error message:', error?.message);
      
      if (error instanceof NotFoundException) {
        throw new RpcException({ statusCode: 404, message: error.message });
      }
      
      // Log Prisma errors in detail
      if (error?.code) {
        console.error('[ToolMarketingController] Prisma error code:', error.code);
        console.error('[ToolMarketingController] Prisma error meta:', JSON.stringify(error?.meta, null, 2));
      }
      
      throw new RpcException({ 
        statusCode: error?.statusCode || 500, 
        message: error?.message || 'Internal server error',
        error: error?.code || 'UNKNOWN_ERROR'
      });
    }
  }
}

