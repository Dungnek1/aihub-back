import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiGatewayService } from '../services/api-gateway.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser, Public, ResponseMessage, Roles } from '../decorators';
import type { JwtPayload } from '@app/shared/interface.ts/user.interface';
import { Role } from '@app/shared/enum/user.enum';

@ApiTags('Web Info')
@Controller('web-info')
export class WebInfoController {
    constructor(private readonly apiGateway: ApiGatewayService) { }

    // RuleUser endpoints
    @Post('rule-user')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
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
    async createRuleUser(@Body() data: { content: string }, @CurrentUser() user: JwtPayload) {
        return this.apiGateway.forwardToService('WEB_INFO', 'web-info.createRuleUser', {
            ...data,
            createdBy: user.userId,
        });
    }

    @Get('rule-user')
    @Public()
    @ResponseMessage('get all user rules successfully')
    @ApiOperation({ summary: 'Get all user rules' })
    @ApiResponse({ status: 200, description: 'List of user rules' })
    async getAllRuleUsers() {
        return this.apiGateway.forwardToService('WEB_INFO', 'web-info.getAllRuleUsers', {});
    }

    @Get('rule-user/:ruleId')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get a user rule by ID' })
    @ApiResponse({ status: 200, description: 'User rule details' })
    @ApiResponse({ status: 404, description: 'Rule not found' })
    async getRuleUserById(@Param('ruleId') ruleId: string) {
        return this.apiGateway.forwardToService('WEB_INFO', 'web-info.getRuleUserById', { ruleId });
    }

    @Put('rule-user/:ruleId')
    @ApiBearerAuth('JWT-auth')
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
    async updateRuleUser(@Param('ruleId') ruleId: string, @Body() data: { content: string }, @CurrentUser() user: JwtPayload) {
        return this.apiGateway.forwardToService('WEB_INFO', 'web-info.updateRuleUser', {
            ruleId,
            ...data,
            updatedBy: user.userId,
        });
    }

    @Delete('rule-user/:ruleId')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Delete a user rule' })
    @ApiResponse({ status: 200, description: 'Rule deleted successfully' })
    @ApiResponse({ status: 404, description: 'Rule not found' })
    async deleteRuleUser(@Param('ruleId') ruleId: string) {
        return this.apiGateway.forwardToService('WEB_INFO', 'web-info.deleteRuleUser', { ruleId });
    }

    // RuleBlog endpoints
    @Post('rule-blog')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
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
    async createRuleBlog(@Body() data: { content: string }, @CurrentUser() user: JwtPayload) {
        return this.apiGateway.forwardToService('WEB_INFO', 'web-info.createRuleBlog', {
            ...data,
            createdBy: user.userId,
        });
    }

    @Get('rule-blog')
    @Public()
    @ResponseMessage('get all blog rules successfully')
    @ApiOperation({ summary: 'Get all blog rules' })
    @ApiResponse({ status: 200, description: 'List of blog rules' })
    async getAllRuleBlogs() {
        return this.apiGateway.forwardToService('WEB_INFO', 'web-info.getAllRuleBlogs', {});
    }

    @Get('rule-blog/:ruleId')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get a blog rule by ID' })
    @ApiResponse({ status: 200, description: 'Blog rule details' })
    @ApiResponse({ status: 404, description: 'Rule not found' })
    async getRuleBlogById(@Param('ruleId') ruleId: string) {
        return this.apiGateway.forwardToService('WEB_INFO', 'web-info.getRuleBlogById', { ruleId });
    }

    @Put('rule-blog/:ruleId')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
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
    async updateRuleBlog(@Param('ruleId') ruleId: string, @Body() data: { content: string }, @CurrentUser() user: JwtPayload) {
        return this.apiGateway.forwardToService('WEB_INFO', 'web-info.updateRuleBlog', {
            ruleId,
            ...data,
            updatedBy: user.userId,
        });
    }

    @Delete('rule-blog/:ruleId')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Delete a blog rule' })
    @ApiResponse({ status: 200, description: 'Rule deleted successfully' })
    @ApiResponse({ status: 404, description: 'Rule not found' })
    async deleteRuleBlog(@Param('ruleId') ruleId: string) {
        return this.apiGateway.forwardToService('WEB_INFO', 'web-info.deleteRuleBlog', { ruleId });
    }

    // Site Settings endpoints
    @Get('site-settings')
    @Public()
    @ResponseMessage('get site settings successfully')
    @ApiOperation({ summary: 'Get site settings' })
    @ApiResponse({ status: 200, description: 'Site settings' })
    async getSiteSettings() {
        return this.apiGateway.forwardToService('WEB_INFO', 'web-info.getSiteSettings', {});
    }

    @Put('site-settings')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Update site settings' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                siteName: { type: 'string' },
                siteUrl: { type: 'string' },
                siteDescription: { type: 'string' },
                contactEmail: { type: 'string' },
                postsPerPage: { type: 'number' },
                enableComments: { type: 'boolean' },
                enableReactions: { type: 'boolean' },
                enableSharing: { type: 'boolean' },
                moderationRequired: { type: 'boolean' },
                maintenanceMode: { type: 'boolean' },
                socialLinks: {
                    type: 'object',
                    properties: {
                        telegram: { type: 'string' },
                        discord: { type: 'string' },
                        facebook: { type: 'string' },
                        instagram: { type: 'string' },
                        twitter: { type: 'string' },
                    },
                },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'Site settings updated successfully' })
    async updateSiteSettings(@Body() data: any, @CurrentUser() user: JwtPayload) {
        return this.apiGateway.forwardToService('WEB_INFO', 'web-info.updateSiteSettings', {
            ...data,
            updatedBy: user?.userId,
        });
    }
}
