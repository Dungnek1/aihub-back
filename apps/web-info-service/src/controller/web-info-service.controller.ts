import { Controller, Get, Post, Put, Delete, Body, Param, Query, MessagePattern, Ctx, Payload } from '@nestjs/common';
import { WebInfoServiceService } from '../service/web-info-service.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { RmqContext } from '@nestjs/microservices';

// Helper type guard for Rmq message ack/nack
function isAckNackable(msg: unknown): msg is {
  ack: (m?: unknown) => void;
  nack: (m?: unknown, allUpTo?: boolean, requeue?: boolean) => void;
} {
  return (
    typeof msg === 'object' && msg !== null && 'ack' in msg && 'nack' in msg
  );
}

@ApiTags('Web Info')
@Controller('web-info')
export class WebInfoServiceController {
  constructor(private readonly webInfoServiceService: WebInfoServiceService) { }

  @Get()
  getHello(): string {
    return this.webInfoServiceService.getHello();
  }

  // RuleUser endpoints
  @Post('rule-user')
  @ApiOperation({ summary: 'Create a new rule for users' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string', example: 'User must be 18+ years old' },
      },
      required: ['content'],
    },
  })
  @ApiResponse({ status: 201, description: 'Rule created successfully' })
  async createRuleUser(@Body() data: { content: string }) {
    return this.webInfoServiceService.createRuleUser(data);
  }

  @Get('rule-user')
  @ApiOperation({ summary: 'Get all user rules' })
  @ApiResponse({ status: 200, description: 'List of user rules' })
  async getAllRuleUsers() {
    return this.webInfoServiceService.getAllRuleUsers();
  }

  @Get('rule-user/:ruleId')
  @ApiOperation({ summary: 'Get a user rule by ID' })
  @ApiResponse({ status: 200, description: 'User rule details' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async getRuleUserById(@Param('ruleId') ruleId: string) {
    return this.webInfoServiceService.getRuleUserById(ruleId);
  }

  @Put('rule-user/:ruleId')
  @ApiOperation({ summary: 'Update a user rule' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string', example: 'Updated rule content' },
      },
      required: ['content'],
    },
  })
  @ApiResponse({ status: 200, description: 'Rule updated successfully' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async updateRuleUser(@Param('ruleId') ruleId: string, @Body() data: { content: string }) {
    return this.webInfoServiceService.updateRuleUser(ruleId, data);
  }

  @Delete('rule-user/:ruleId')
  @ApiOperation({ summary: 'Delete a user rule' })
  @ApiResponse({ status: 200, description: 'Rule deleted successfully' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async deleteRuleUser(@Param('ruleId') ruleId: string) {
    return this.webInfoServiceService.deleteRuleUser(ruleId);
  }

  // RuleBlog endpoints
  @Post('rule-blog')
  @ApiOperation({ summary: 'Create a new rule for blogs' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string', example: 'Blog posts must be original' },
      },
      required: ['content'],
    },
  })
  @ApiResponse({ status: 201, description: 'Rule created successfully' })
  async createRuleBlog(@Body() data: { content: string }) {
    return this.webInfoServiceService.createRuleBlog(data);
  }

  @Get('rule-blog')
  @ApiOperation({ summary: 'Get all blog rules' })
  @ApiResponse({ status: 200, description: 'List of blog rules' })
  async getAllRuleBlogs() {
    return this.webInfoServiceService.getAllRuleBlogs();
  }

  @Get('rule-blog/:ruleId')
  @ApiOperation({ summary: 'Get a blog rule by ID' })
  @ApiResponse({ status: 200, description: 'Blog rule details' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async getRuleBlogById(@Param('ruleId') ruleId: string) {
    return this.webInfoServiceService.getRuleBlogById(ruleId);
  }

  @Put('rule-blog/:ruleId')
  @ApiOperation({ summary: 'Update a blog rule' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string', example: 'Updated blog rule content' },
      },
      required: ['content'],
    },
  })
  @ApiResponse({ status: 200, description: 'Rule updated successfully' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async updateRuleBlog(@Param('ruleId') ruleId: string, @Body() data: { content: string }) {
    return this.webInfoServiceService.updateRuleBlog(ruleId, data);
  }

  @Delete('rule-blog/:ruleId')
  @ApiOperation({ summary: 'Delete a blog rule' })
  @ApiResponse({ status: 200, description: 'Rule deleted successfully' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async deleteRuleBlog(@Param('ruleId') ruleId: string) {
    return this.webInfoServiceService.deleteRuleBlog(ruleId);
  }

  // MessagePattern handlers for microservice communication
  @MessagePattern('web-info.createRuleUser')
  async handleCreateRuleUser(@Payload() data: { content: string; createdBy?: string }, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.webInfoServiceService.createRuleUser(data, data.createdBy);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('web-info.getAllRuleUsers')
  async handleGetAllRuleUsers(@Payload() data: any, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.webInfoServiceService.getAllRuleUsers();
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('web-info.getRuleUserById')
  async handleGetRuleUserById(@Payload() data: { ruleId: string }, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.webInfoServiceService.getRuleUserById(data.ruleId);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('web-info.updateRuleUser')
  async handleUpdateRuleUser(@Payload() data: { ruleId: string; content: string; updatedBy?: string }, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.webInfoServiceService.updateRuleUser(data.ruleId, { content: data.content }, data.updatedBy);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('web-info.deleteRuleUser')
  async handleDeleteRuleUser(@Payload() data: { ruleId: string }, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.webInfoServiceService.deleteRuleUser(data.ruleId);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('web-info.createRuleBlog')
  async handleCreateRuleBlog(@Payload() data: { content: string; createdBy?: string }, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.webInfoServiceService.createRuleBlog(data, data.createdBy);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('web-info.getAllRuleBlogs')
  async handleGetAllRuleBlogs(@Payload() data: any, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.webInfoServiceService.getAllRuleBlogs();
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('web-info.getRuleBlogById')
  async handleGetRuleBlogById(@Payload() data: { ruleId: string }, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.webInfoServiceService.getRuleBlogById(data.ruleId);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('web-info.updateRuleBlog')
  async handleUpdateRuleBlog(@Payload() data: { ruleId: string; content: string; updatedBy?: string }, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.webInfoServiceService.updateRuleBlog(data.ruleId, { content: data.content }, data.updatedBy);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('web-info.deleteRuleBlog')
  async handleDeleteRuleBlog(@Payload() data: { ruleId: string }, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.webInfoServiceService.deleteRuleBlog(data.ruleId);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  // Site Settings MessagePattern handlers
  @MessagePattern('web-info.getSiteSettings')
  async handleGetSiteSettings(@Payload() data: any, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.webInfoServiceService.getSiteSettings();
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('web-info.updateSiteSettings')
  async handleUpdateSiteSettings(@Payload() data: {
    siteName?: string;
    siteUrl?: string;
    siteDescription?: string;
    contactEmail?: string;
    postsPerPage?: number;
    enableComments?: boolean;
    enableReactions?: boolean;
    enableSharing?: boolean;
    moderationRequired?: boolean;
    maintenanceMode?: boolean;
    socialLinks?: {
      telegram?: string;
      discord?: string;
      facebook?: string;
      instagram?: string;
      twitter?: string;
    };
    updatedBy?: string;
  }, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const { updatedBy, ...settingsData } = data;
      const result = await this.webInfoServiceService.updateSiteSettings(settingsData, updatedBy);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }
}
