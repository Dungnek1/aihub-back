import { Body, Controller, Get, Post, Delete, Res, Query, Param, Put, UseInterceptors, Req } from '@nestjs/common';
import { ApiGatewayService } from '../services/api-gateway.service';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { CurrentUser, Public, ResponseMessage, Roles } from '../decorators';
import { Role } from '@app/shared/enum/user.enum';
import type { JwtPayload } from '@app/shared/interface.ts/user.interface';
import { AnyFilesInterceptor } from '@nestjs/platform-express';



@ApiTags('Tools')
@Controller('tools')
export class ToolServiceController {
    constructor(private readonly apiGateway: ApiGatewayService) { }


    @Post('create')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Create a new AI tool', operationId: 'createTool' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Tool creation data',
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string', example: 'ChatGPT', description: 'Tool name' },
                description: { type: 'string', example: 'AI-powered chat assistant', description: 'Tool description' },
                logoUrl: { type: 'string', example: 'https://example.com/logo.png', description: 'Tool logo URL' },
                bodyHtml: { type: 'string', example: '<div class="content-section">Tool detailed description</div>', description: 'Tool HTML content with inline CSS' },
                priceId: { type: 'string', example: 'price-uuid-123', description: 'Price ID for the tool' },
                tagIds: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['tag-uuid-1', 'tag-uuid-2'],
                    description: 'Array of tag IDs'
                },
                audienceIds: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['audience-uuid-1', 'audience-uuid-2'],
                    description: 'Array of audience IDs'
                },
            },
            required: ['name', 'description', 'logoUrl', 'bodyHtml', 'priceId'],
        },
    })
    @ApiResponse({ status: 201, description: 'Tool created successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized - Admin access required' })
    @ApiResponse({ status: 409, description: 'Tool already exists' })
    @Roles(Role.ADMIN)
    @ResponseMessage('Tool created successfully')
    @UseInterceptors(AnyFilesInterceptor())
    async createTool(
        @Req() req: Request,
        @CurrentUser() user: JwtPayload,
    ): Promise<unknown> {

        // Multer (AnyFilesInterceptor) runs and populates req.body for multipart/form-data.
        // If you don't need file uploads, this still ensures fields are parsed.
        const formData: any = req.body || {};
        const { name, description, logoUrl, bodyHtml, priceId, tagIds, audienceIds } = formData;

        // Ensure tagIds and audienceIds are always arrays
        const processedBody = {
            name,
            description,
            logoUrl,
            bodyHtml,
            priceId,
            tagIds: Array.isArray(tagIds) ? tagIds : tagIds ? [tagIds] : [],
            audienceIds: Array.isArray(audienceIds) ? audienceIds : audienceIds ? [audienceIds] : [],
        };

        return this.apiGateway.forwardToService('TOOL', 'tool.create', { body: processedBody, user });
    }

    @Get('top')
    @Public()
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get top rated tools', operationId: 'getTopTools' })
    @ApiQuery({ name: 'pageNo', required: false, type: Number, description: 'Page number (default: 0)' })
    @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Page size (default: 4)' })
    @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sort by field (default: avgRating)' })
    @ApiQuery({ name: 'sortType', required: false, type: String, description: 'Sort type: asc or desc (default: desc)' })
    @ApiQuery({ name: 'status', required: false, type: Number, description: 'Status: 1 for active, 0 for inactive (default: 1)' })
    @ApiQuery({ name: 'price', required: false, type: String, description: 'Price type: PAID or TRIAL' })
    @ApiResponse({ status: 200, description: 'Top tools retrieved successfully' })
    @ResponseMessage('Top tools retrieved successfully')
    async getTopTools(
        @Query('pageNo') pageNo: number = 0,
        @Query('pageSize') pageSize: number = 4,
        @Query('sortBy') sortBy: string = 'avgRating',
        @Query('sortType') sortType: string = 'desc',
        @Query('status') status: number = 1,
        @Query('price') price?: string,
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL', 'tool.top', {
            pageNo: Number(pageNo),
            pageSize: Number(pageSize),
            sortBy,
            sortType,
            status: Number(status),
            price,
        });
    }

    @Get('tags')
    @Public()
    @ApiOperation({ summary: 'Get list of tags with pagination', operationId: 'getTags' })
    @ApiQuery({ name: 'pageNo', required: false, type: Number, description: 'Page number (default: 0)' })
    @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Page size (default: 10)' })
    @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sort by field (default: name)' })
    @ApiQuery({ name: 'sortType', required: false, type: String, description: 'Sort type: asc or desc (default: asc)' })
    @ApiResponse({ status: 200, description: 'Tags retrieved successfully' })
    @ResponseMessage('Tags retrieved successfully')
    async getTags(
        @Query('pageNo') pageNo: number = 0,
        @Query('pageSize') pageSize: number = 10,
        @Query('sortBy') sortBy: string = 'name',
        @Query('sortType') sortType: string = 'asc',
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL', 'tag.list', {
            pageNo: Number(pageNo),
            pageSize: Number(pageSize),
            sortBy,
            sortType,
        });
    }

    @Get('tags/search')
    @Public()
    @ApiOperation({ summary: 'Search tags by name', operationId: 'searchTags' })
    @ApiQuery({ name: 'name', required: true, type: String, description: 'Tag name to search' })
    @ApiQuery({ name: 'pageNo', required: false, type: Number, description: 'Page number (default: 0)' })
    @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Page size (default: 10)' })
    @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sort by field (default: name)' })
    @ApiQuery({ name: 'sortType', required: false, type: String, description: 'Sort type: asc or desc (default: asc)' })
    @ApiResponse({ status: 200, description: 'Tags search results retrieved successfully' })
    @ResponseMessage('Tags search results retrieved successfully')
    async searchTags(
        @Query('name') name: string,
        @Query('pageNo') pageNo: number = 0,
        @Query('pageSize') pageSize: number = 10,
        @Query('sortBy') sortBy: string = 'name',
        @Query('sortType') sortType: string = 'asc',
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL', 'tag.search', {
            name,
            pageNo: Number(pageNo),
            pageSize: Number(pageSize),
            sortBy,
            sortType,
        });
    }

    @Post('tag/create')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Create a new tag', operationId: 'createTag' })
    @ApiBody({
        description: 'Tag creation data',
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string', example: 'AI Assistant', description: 'Tag name' },
            },
            required: ['name'],
        },
    })
    @ApiResponse({ status: 201, description: 'Tag created successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized - Admin access required' })
    @ApiResponse({ status: 409, description: 'Tag already exists' })
    @Roles(Role.ADMIN)
    @ResponseMessage('Tag created successfully')
    async createTag(
        @Body() body: { name: string },
        @CurrentUser() user: JwtPayload,
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL', 'tag.create', { body, user });
    }

    @Post('assign-tag')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Assign tag to tool', operationId: 'assignTagToTool' })
    @ApiBody({
        description: 'Tag assignment data',
        schema: {
            type: 'object',
            properties: {
                toolId: { type: 'string', example: 'tool-123', description: 'Tool ID' },
                tagId: { type: 'string', example: 'tag-456', description: 'Tag ID' },
            },
            required: ['toolId', 'tagId'],
        },
    })
    @ApiResponse({ status: 201, description: 'Tag assigned to tool successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized - Admin access required' })
    @ApiResponse({ status: 404, description: 'Tool or tag not found' })
    @ApiResponse({ status: 409, description: 'Tag already assigned to this tool' })
    @Roles(Role.ADMIN)
    @ResponseMessage('Tag assigned to tool successfully')
    async assignTagToTool(
        @Body() body: { toolId: string; tagId: string },
        @CurrentUser() user: JwtPayload,
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL', 'tool.assign-tag', { ...body, userId: user.userId });
    }

    @Post('rate')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Rate a tool', operationId: 'rateTool' })
    @ApiBody({
        description: 'Tool rating data',
        schema: {
            type: 'object',
            properties: {
                toolId: { type: 'string', example: 'tool-123', description: 'Tool ID to rate' },
                stars: { type: 'number', example: 5, description: 'Rating stars (0-5)', minimum: 0, maximum: 5 },
            },
            required: ['toolId', 'stars'],
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Tool rated successfully',
        schema: {
            type: 'object',
            properties: {
                rating: {
                    type: 'object',
                    description: 'The created/updated rating record'
                },
                avgRating: {
                    type: 'number',
                    example: 4.2,
                    description: 'New average rating after update'
                },
                ratingsCount: {
                    type: 'number',
                    example: 15,
                    description: 'Total number of ratings after update'
                }
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Invalid rating value' })
    @ApiResponse({ status: 404, description: 'Tool not found' })
    @ResponseMessage('Tool rated successfully')
    async rateTool(
        @Body() body: { toolId: string; stars: number },
        @CurrentUser() user: JwtPayload,
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL', 'tool.rate', {
            toolId: body.toolId,
            userId: user.userId,
            stars: body.stars,
        });
    }

    @Post('use')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Mark tool as used', operationId: 'markToolAsUsed' })
    @ApiBody({
        description: 'Tool usage data',
        schema: {
            type: 'object',
            properties: {
                toolId: { type: 'string', example: 'tool-123', description: 'Tool ID' },
            },
            required: ['toolId'],
        },
    })
    @ApiResponse({ status: 200, description: 'Tool marked as used successfully' })
    @ApiResponse({ status: 404, description: 'Tool not found' })
    @ResponseMessage('Tool marked as used successfully')
    async markToolAsUsed(
        @Body() body: { toolId: string },
        @CurrentUser() user: JwtPayload,
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL', 'tool.use', {
            userId: user.userId,
            toolId: body.toolId,
        });
    }

    @Post('save')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Save or unsave a tool', operationId: 'toggleSaveTool' })
    @ApiBody({
        description: 'Tool save data',
        schema: {
            type: 'object',
            properties: {
                toolId: { type: 'string', example: 'tool-123', description: 'Tool ID' },
            },
            required: ['toolId'],
        },
    })
    @ApiResponse({ status: 200, description: 'Tool save status toggled successfully' })
    @ApiResponse({ status: 404, description: 'Tool not found' })
    @ResponseMessage('Tool save status updated successfully')
    async toggleSaveTool(
        @Body() body: { toolId: string },
        @CurrentUser() user: JwtPayload,
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL', 'tool.save', {
            userId: user.userId,
            toolId: body.toolId,
        });
    }

    @Get('used')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get user\'s used tools', operationId: 'getUserUsedTools' })
    @ApiQuery({ name: 'pageNo', required: false, type: Number, description: 'Page number (default: 0)' })
    @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Page size (default: 10)' })
    @ApiResponse({ status: 200, description: 'User used tools retrieved successfully' })
    @ResponseMessage('User used tools retrieved successfully')
    async getUserUsedTools(
        @Query('pageNo') pageNo: number = 0,
        @Query('pageSize') pageSize: number = 10,
        @CurrentUser() user: JwtPayload,
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL', 'tool.get-used', {
            userId: user.userId,
            pageNo: Number(pageNo),
            pageSize: Number(pageSize),
        });
    }

    @Get('saved')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get user\'s saved tools', operationId: 'getUserSavedTools' })
    @ApiQuery({ name: 'pageNo', required: false, type: Number, description: 'Page number (default: 0)' })
    @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Page size (default: 10)' })
    @ApiResponse({ status: 200, description: 'User saved tools retrieved successfully' })
    @ResponseMessage('User saved tools retrieved successfully')
    async getUserSavedTools(
        @Query('pageNo') pageNo: number = 0,
        @Query('pageSize') pageSize: number = 10,
        @CurrentUser() user: JwtPayload,
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL', 'tool.get-saved', {
            userId: user.userId,
            pageNo: Number(pageNo),
            pageSize: Number(pageSize),
        });
    }

    @Get('detail')
    @ResponseMessage('Get tool detail by toolID successfully')
    @Public()
    @ApiOperation({ summary: "Get tool detail", operationId: 'getToolDetail' })
    @ApiQuery({ name: 'toolId', required: true, type: String, description: 'Tool ID' })
    @ApiResponse({ status: 200, description: 'Tool detail retrieved successfully' })
    async getToolDetail(
        @Query('toolId') toolId: string,
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL', 'tool.detail', { toolId });
    }



    @Get('filter')
    @Public()
    @ApiOperation({ summary: 'Filter tools by price and audience', operationId: 'filterTools' })
    @ApiQuery({ name: 'pageNo', required: false, type: Number, description: 'Page number (default: 0)' })
    @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Page size (default: 8)' })
    @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sort by field (default: avgRating)' })
    @ApiQuery({ name: 'sortType', required: false, type: String, description: 'Sort type: asc or desc (default: desc)' })
    @ApiQuery({ name: 'status', required: false, type: Number, description: 'Status filter' })
    @ApiQuery({ name: 'price', required: false, type: String, description: 'Price filter: Trial or Paid' })
    @ApiQuery({ name: 'audience', required: false, type: String, description: 'Audience filter (e.g., Beginner, Advanced)' })
    @ApiResponse({ status: 200, description: 'Filtered tools retrieved successfully' })
    @ResponseMessage('Filtered tools retrieved successfully')
    async filterTools(
        @Query('pageNo') pageNo: number = 0,
        @Query('pageSize') pageSize: number = 8,
        @Query('sortBy') sortBy: string = 'avgRating',
        @Query('sortType') sortType: string = 'desc',
        @Query('status') status?: number,
        @Query('price') price?: string,
        @Query('audience') audience?: string,
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL', 'tool.filter', {
            pageNo: Number(pageNo),
            pageSize: Number(pageSize),
            sortBy,
            sortType,
            status: status !== undefined ? Number(status) : undefined,
            price,
            audience,
        });
    }

    @Get('audiences')
    @Public()
    @ApiOperation({ summary: 'Get all audiences', operationId: 'getAudiences' })
    @ApiResponse({ status: 200, description: 'Audiences retrieved successfully' })
    @ResponseMessage('Audiences retrieved successfully')
    async getAudiences(): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL', 'audience.all', {});
    }

    @Post('assign-audience')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Assign audience to tool', operationId: 'assignAudienceToTool' })
    @ApiBody({
        description: 'Audience assignment data',
        schema: {
            type: 'object',
            properties: {
                toolId: { type: 'string', example: 'tool-123', description: 'Tool ID' },
                audienceId: { type: 'string', example: 'audience-456', description: 'Audience ID' },
            },
            required: ['toolId', 'audienceId'],
        },
    })
    @ApiResponse({ status: 201, description: 'Audience assigned to tool successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized - Admin access required' })
    @ApiResponse({ status: 404, description: 'Tool or audience not found' })
    @ApiResponse({ status: 409, description: 'Audience already assigned to this tool' })
    @Roles(Role.ADMIN)
    @ResponseMessage('Audience assigned to tool successfully')
    async assignAudienceToTool(
        @Body() body: { toolId: string; audienceId: string },
        @CurrentUser() user: JwtPayload,
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL', 'tool.assign-audience', {
            toolId: body.toolId,
            audienceId: body.audienceId,
            userId: user.userId,
        });
    }

    @Post('audience/create')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Create a new audience', operationId: 'createAudience' })
    @ApiBody({
        description: 'Audience creation data',
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string', example: 'Beginner', description: 'Audience name' },
            },
            required: ['name'],
        },
    })
    @ApiResponse({ status: 201, description: 'Audience created successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized - Admin access required' })
    @ApiResponse({ status: 409, description: 'Audience already exists' })
    @Roles(Role.ADMIN)
    @ResponseMessage('Audience created successfully')
    async createAudience(
        @Body() body: { name: string },
        @CurrentUser() user: JwtPayload,
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL', 'audience.create', { body, user });
    }

    @Delete('usage/:toolId')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Remove tool usage record', operationId: 'removeToolUsage' })
    @ApiResponse({ status: 200, description: 'Tool usage record removed successfully' })
    @ApiResponse({ status: 404, description: 'Tool or usage record not found' })
    @ResponseMessage('Tool usage record removed successfully')
    async removeToolUsage(
        @CurrentUser() user: JwtPayload,
        @Res() res: any,
        @Param('toolId') toolId: string,
    ): Promise<unknown> {
        const result = await this.apiGateway.forwardToService('TOOL', 'tool.remove-usage', {
            userId: user.userId,
            toolId,
        });
        return res.status(200).json(result);
    }

    @Delete('saved/:toolId')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Remove saved tool', operationId: 'removeSavedTool' })
    @ApiResponse({ status: 200, description: 'Saved tool removed successfully' })
    @ApiResponse({ status: 404, description: 'Tool or saved record not found' })
    @ResponseMessage('Saved tool removed successfully')
    async removeSavedTool(
        @CurrentUser() user: JwtPayload,
        @Res() res: any,
        @Param('toolId') toolId: string,
    ): Promise<unknown> {
        const result = await this.apiGateway.forwardToService('TOOL', 'tool.remove-saved', {
            userId: user.userId,
            toolId,
        });
        return res.status(200).json(result);
    }

    @Post('price/create')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Create a new price', operationId: 'createPrice' })
    @ApiBody({
        description: 'Price creation data',
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string', example: 'PAID', description: 'Price name' },
            },
            required: ['name'],
        },
    })
    @ApiResponse({ status: 201, description: 'Price created successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized - Admin access required' })
    @ApiResponse({ status: 409, description: 'Price name already exists' })
    @Roles(Role.ADMIN)
    @ResponseMessage('Price created successfully')
    async createPrice(
        @Body() body: { name: string },
        @CurrentUser() user: JwtPayload,
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL', 'price.create', { body, user });
    }

    @Put(':toolId/price')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Update tool price', operationId: 'updateToolPrice' })
    @ApiBody({
        description: 'Price update data',
        schema: {
            type: 'object',
            properties: {
                priceId: { type: 'string', example: 'price-123', description: 'Price ID' },
            },
            required: ['priceId'],
        },
    })
    @ApiResponse({ status: 200, description: 'Tool price updated successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized - Admin access required' })
    @ApiResponse({ status: 404, description: 'Tool or price not found' })
    @Roles(Role.ADMIN)
    @ResponseMessage('Tool price updated successfully')
    async updateToolPrice(
        @Param('toolId') toolId: string,
        @Body() body: { priceId: string },
        @CurrentUser() user: JwtPayload,
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL', 'tool.update-price', {
            toolId,
            priceId: body.priceId,
            userId: user.userId,
        });
    }

    @Get('prices')
    @Public()
    @ApiOperation({ summary: 'Get all prices', operationId: 'getAllPrices' })
    @ApiResponse({ status: 200, description: 'Prices retrieved successfully' })
    @ResponseMessage('Prices retrieved successfully')
    async getAllPrices(): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL', 'price.all', {});
    }

    @Get('rating-stats/:toolId')
    @Public()
    @ApiOperation({ summary: 'Get tool rating statistics', operationId: 'getToolRatingStats' })
    @ApiResponse({
        status: 200,
        description: 'Tool rating statistics retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                toolId: { type: 'string', example: 'tool-123' },
                toolName: { type: 'string', example: 'ChatGPT' },
                avgRating: { type: 'number', example: 4.5 },
                totalRatings: { type: 'number', example: 100 },
                ratingDistribution: {
                    type: 'object',
                    properties: {
                        oneStar: { type: 'number', example: 5 },
                        twoStars: { type: 'number', example: 10 },
                        threeStars: { type: 'number', example: 15 },
                        fourStars: { type: 'number', example: 30 },
                        fiveStars: { type: 'number', example: 40 },
                    },
                },
                percentages: {
                    type: 'object',
                    properties: {
                        oneStar: { type: 'string', example: '5.0' },
                        twoStars: { type: 'string', example: '10.0' },
                        threeStars: { type: 'string', example: '15.0' },
                        fourStars: { type: 'string', example: '30.0' },
                        fiveStars: { type: 'string', example: '40.0' },
                    },
                },
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Tool not found' })
    @ResponseMessage('Tool rating statistics retrieved successfully')
    async getToolRatingStats(
        @Param('toolId') toolId: string,
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL', 'tool.rating-stats', { toolId });
    }
}
