import { Controller, Get } from '@nestjs/common';
import { ToolServiceService } from '../services/tool-service.service';
import { MessagePattern } from '@nestjs/microservices';
import { JwtPayload } from '@app/shared/interface.ts/user.interface';


@Controller('tools')
export class ToolServiceController {
  constructor(private readonly toolServiceService: ToolServiceService) { }

  @MessagePattern('tool.create')
  async createTool(data: { body: any; user: JwtPayload }): Promise<unknown> {
    return this.toolServiceService.createTool(data.body, data.user);
  }

  @MessagePattern('tool.top')
  async getTopTools(data: unknown): Promise<unknown> {
    return this.toolServiceService.getTopTools(data as any);
  }

  @MessagePattern('tag.create')
  async createTag(data: { body: { name: string }; user: { userId: string } }): Promise<unknown> {
    return this.toolServiceService.createTag({
      name: data.body.name,
      userId: data.user.userId,
    });
  }

  @MessagePattern('tool.assign-tag')
  async assignTagToTool(data: { toolId: string; tagId: string; userId: string }): Promise<unknown> {
    return this.toolServiceService.assignTagToTool(data);
  }

  @MessagePattern('tag.list')
  async getTags(data: { pageNo?: number; pageSize?: number }): Promise<unknown> {
    return this.toolServiceService.getTags(data.pageNo, data.pageSize);
  }

  @MessagePattern('tag.search')
  async searchTags(data: { searchQuery: string; pageNo?: number; pageSize?: number }): Promise<unknown> {
    return this.toolServiceService.searchTags(data.searchQuery, data.pageNo, data.pageSize);
  }

  @MessagePattern('tool.use')
  async markToolAsUsed(data: { userId: string; toolId: string }): Promise<unknown> {
    return this.toolServiceService.markToolAsUsed(data.userId, data.toolId);
  }

  @MessagePattern('tool.save')
  async toggleSaveTool(data: { userId: string; toolId: string }): Promise<unknown> {
    return this.toolServiceService.toggleSaveTool(data.userId, data.toolId);
  }

  @MessagePattern('tool.get-used')
  async getUserUsedTools(data: { userId: string; pageNo?: number; pageSize?: number }): Promise<unknown> {
    return this.toolServiceService.getUserUsedTools(data.userId, data.pageNo, data.pageSize);
  }

  @MessagePattern('tool.get-saved')
  async getUserSavedTools(data: { userId: string; pageNo?: number; pageSize?: number }): Promise<unknown> {
    return this.toolServiceService.getUserSavedTools(data.userId, data.pageNo, data.pageSize);
  }

  @MessagePattern('tool.rate')
  async rateTool(data: { toolId: string; userId: string; stars: number }): Promise<unknown> {
    return this.toolServiceService.rateTool(data.toolId, data.userId, data.stars);
  }

  @MessagePattern('tool.detail')
  async getToolDetail(data: { slug: string }): Promise<unknown> {
    return this.toolServiceService.getToolDetail(data.slug);
  }

  @MessagePattern('tool.filter')
  async filterTools(data: unknown): Promise<unknown> {
    return this.toolServiceService.filterTools(data as any);
  }

  @MessagePattern('audience.create')
  async createAudience(data: { body: { name: string }; user: { userId: string } }): Promise<unknown> {
    return this.toolServiceService.createAudience({
      name: data.body.name,
      userId: data.user.userId,
    });
  }

  @MessagePattern('audience.all')
  async getAudiences(): Promise<unknown> {
    return this.toolServiceService.getAudiences();
  }

  @MessagePattern('tool.assign-audience')
  async assignAudienceToTool(data: { toolId: string; audienceId: string; userId: string }): Promise<unknown> {
    return this.toolServiceService.assignAudienceToTool(data);
  }

  @MessagePattern('tool.remove-usage')
  async removeToolUsage(data: { userId: string; toolId: string }): Promise<unknown> {
    return this.toolServiceService.removeToolUsage(data.userId, data.toolId);
  }

  // ===== ADMIN MESSAGE PATTERNS =====

  @MessagePattern('admin.getTools')
  async handleAdminGetTools(data: any): Promise<unknown> {
    return this.toolServiceService.getToolsAdmin(data);
  }

  @MessagePattern('admin.getTool')
  async handleAdminGetTool(data: { toolId: string }): Promise<unknown> {
    return this.toolServiceService.getToolAdmin(data.toolId);
  }

  @MessagePattern('admin.updateTool')
  async handleAdminUpdateTool(data: { toolId: string; updatedBy?: string;[key: string]: any }): Promise<unknown> {
    const { toolId, ...updateData } = data;
    return this.toolServiceService.updateToolAdmin(toolId, updateData);
  }

  @MessagePattern('admin.deleteTool')
  async handleAdminDeleteTool(data: { toolId: string; deletedBy?: string }): Promise<unknown> {
    await this.toolServiceService.deleteToolAdmin(data.toolId, data.deletedBy);
    return { success: true };
  }

  @MessagePattern('tool.remove-saved')
  async removeSavedTool(data: { userId: string; toolId: string }): Promise<unknown> {
    return this.toolServiceService.removeSavedTool(data.userId, data.toolId);
  }

  @MessagePattern('price.create')
  async createPrice(data: { body: { name: string }; user: { userId: string } }): Promise<unknown> {
    return this.toolServiceService.createPrice({
      name: data.body.name as any,
      userId: data.user.userId,
    });
  }

  @MessagePattern('tool.update-price')
  async updateToolPrice(data: { toolId: string; priceId: string; userId: string }): Promise<unknown> {
    return this.toolServiceService.updateToolPrice(data);
  }

  @MessagePattern('price.all')
  async getAllPrices(): Promise<unknown> {
    return this.toolServiceService.getAllPrices();
  }

  @MessagePattern('tool.rating-stats')
  async getToolRatingStats(data: { toolId: string }): Promise<unknown> {
    return this.toolServiceService.getToolRatingStats(data.toolId);
  }

  @MessagePattern('tool.getById')
  async getToolById(data: { toolId: string }): Promise<unknown> {
    return this.toolServiceService.getToolById(data.toolId);
  }

  // ===== TAG UPDATE/DELETE =====

  @MessagePattern('tag.update')
  async updateTag(data: { id: string; name: string; userId: string }): Promise<unknown> {
    return this.toolServiceService.updateTag(data);
  }

  @MessagePattern('tag.delete')
  async deleteTag(data: { id: string; userId: string }): Promise<unknown> {
    return this.toolServiceService.deleteTag(data);
  }

  // ===== PRICE UPDATE/DELETE =====

  @MessagePattern('price.update')
  async updatePrice(data: { id: string; name: string; userId: string }): Promise<unknown> {
    return this.toolServiceService.updatePrice(data);
  }

  @MessagePattern('price.delete')
  async deletePrice(data: { id: string; userId: string }): Promise<unknown> {
    return this.toolServiceService.deletePrice(data);
  }

  // ===== AUDIENCE UPDATE/DELETE =====

  @MessagePattern('audience.update')
  async updateAudience(data: { id: string; name: string; userId: string }): Promise<unknown> {
    return this.toolServiceService.updateAudience(data);
  }

  @MessagePattern('audience.delete')
  async deleteAudience(data: { id: string; userId: string }): Promise<unknown> {
    return this.toolServiceService.deleteAudience(data);
  }

  @Get()
  getHello(): string {
    return this.toolServiceService.getHello();
  }
}
