import { Controller, Post, Get, Put, Delete, Body, Param, Query, Headers, UseInterceptors, UploadedFile, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiConsumes, ApiHeader, ApiBody, ApiResponse, ApiTags, ApiQuery, ApiParam } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { CurrentUser, Public, Roles } from '../decorators';
import type { JwtPayload } from '@app/shared/interface.ts/user.interface';
import { ApiGatewayService } from '../services/api-gateway.service';
import { Role } from '@app/shared/enum/user.enum';

@ApiTags('Tool Marketing')
@Controller('tool-marketings')
export class ToolMarketingController {
    constructor(
        private readonly apiGateway: ApiGatewayService,
        @Inject('MEDIA_CLIENT') private mediaClient: ClientProxy,
    ) { }

    @Post('admin')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Create a new tool marketing' })
    @ApiHeader({
        name: 'folder-type',
        description: 'Folder type for organizing uploaded tool marketing files (e.g., tool-marketing, user, default)',
        required: false,
        schema: { type: 'string', default: 'tool-marketing' }
    })
    @ApiBody({
        description: 'Tool Marketing data with optional cover image file',
        schema: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                shortDesc: { type: 'string' },
                description: { type: 'string' },
                priceId: { type: 'string', description: 'Price ID for the tool marketing' },
                categoryId: { type: 'string', description: 'Category ID for the tool marketing' },
                bodyHtml: { type: 'string' },
                seo: { type: 'object', description: 'SEO metadata as JSON' },
                isFeatured: { type: 'boolean', description: 'Tool Marketing nổi bật (default: true)', default: true },
                link: { type: 'string', description: 'Link tham chiếu đến tool marketing' },
                coverImageType: {
                    type: 'string',
                    enum: ['image', 'audio'],
                    description: 'Type of cover image file (required when uploading file)'
                },
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Cover image file (optional)',
                },
            },
            required: ['title', 'priceId'],
        },
    })
    @ApiResponse({ status: 201, description: 'Tool Marketing created' })
    @UseInterceptors(FileInterceptor('file'))
    async createToolMarketing(
        @Body() body: {
            title: string;
            shortDesc?: string;
            description?: string;
            priceId: string;
            categoryId?: string;
            bodyHtml?: string;
            seo?: any;
            coverImageType?: 'image' | 'audio';
            isFeatured?: boolean;
            link?: string;
        },
        @Headers('folder-type') folderType: string = 'tool-marketing',
        @CurrentUser() user: JwtPayload,
        @UploadedFile() file?: Express.Multer.File,
    ): Promise<unknown> {
        let coverImageId: string | undefined;

        // Upload cover image if provided
        if (file && body.coverImageType) {
            const mediaResult = await firstValueFrom(
                this.mediaClient.send(`media.upload.${body.coverImageType}`, {
                    filename: file.filename,
                    originalName: file.originalname,
                    mimeType: file.mimetype,
                    size: file.size,
                    type: body.coverImageType,
                    userId: user.userId,
                    folderType: folderType,
                }),
            );
            console.log('Media upload result:', mediaResult);
            // Get media ID from upload response
            const mediaId = mediaResult?.id;
            if (mediaId) {
                coverImageId = mediaId;
            }
        }

        // Remove file-related fields from body before forwarding
        const { coverImageType: __, ...createBody } = body;

        return this.apiGateway.forwardToService('TOOL_MARKETING_SERVICE', 'admin.createToolMarketing', {
            ...createBody,
            coverImageId,
            createdBy: user.userId,
        });
    }

    @Get()
        @Public()
        @ApiOperation({ summary: 'Get all tool marketings' })
        @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1, type: Number })
        @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 10, type: Number })
        @ApiQuery({ name: 'skip', required: false, description: 'Skip items', example: 0, type: Number })
        @ApiQuery({ name: 'take', required: false, description: 'Take items', example: 10, type: Number })
        @ApiQuery({ name: 'status', required: false, description: 'Filter by status', enum: ['PUBLIC', 'PRIVATE', 'DRAFT'] })
        @ApiQuery({ name: 'isFeatured', required: false, description: 'Filter by featured status', type: Boolean })
        @ApiResponse({ status: 200, description: 'Tool Marketings retrieved' })
        async getToolMarketings(
            @Query('page') page ?: string,
            @Query('limit') limit ?: string,
            @Query('skip') skip ?: string,
            @Query('take') take ?: string,
            @Query('status') status ?: string,
            @Query('isFeatured') isFeatured ?: string,
        ): Promise<unknown> {
            let skipNum: number;
            let takeNum: number;

            if (page !== undefined && limit !== undefined) {
                const pageNum = Math.max(1, parseInt(page) || 1);
                const limitNum = Math.max(1, parseInt(limit) || 10);
                skipNum = (pageNum - 1) * limitNum;
                takeNum = limitNum;
            } else if (skip !== undefined || take !== undefined) {
            skipNum = parseInt(skip || '0');
            takeNum = parseInt(take || '10');
        } else {
            skipNum = 0;
            takeNum = 10;
        }

        // Handle isFeatured parameter - only filter if explicitly provided
        let isFeaturedBool: boolean | undefined = undefined;
        if (isFeatured !== undefined && isFeatured !== null && isFeatured !== '') {
            isFeaturedBool = isFeatured === 'true' || isFeatured === '1';
        }

        return this.apiGateway.forwardToService('TOOL_MARKETING_SERVICE', 'toolMarketing.getAll', {
            skip: skipNum,
            take: takeNum,
            status,
            isFeatured: isFeaturedBool,
        });
    }

    @Get('featured')
    @Public()
    @ApiOperation({ summary: 'Get top featured tool marketings' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of featured tool marketings to return', example: 4, type: Number })
    @ApiResponse({ status: 200, description: 'Featured tool marketings retrieved' })
    async getFeaturedToolMarketings(
        @Query('limit') limit?: string,
    ): Promise<unknown> {
        const limitNum = limit ? Math.max(1, parseInt(limit)) : 4;
        return this.apiGateway.forwardToService('TOOL_MARKETING_SERVICE', 'toolMarketing.getFeatured', {
            limit: limitNum,
        });
    }

    @Get(':id')
    @Public()
    @ApiOperation({ summary: 'Get tool marketing by ID' })
    @ApiParam({ name: 'id', description: 'Tool Marketing ID' })
    @ApiResponse({ status: 200, description: 'Tool Marketing retrieved' })
    @ApiResponse({ status: 404, description: 'Tool Marketing not found' })
    async getToolMarketingById(@Param('id') id: string): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL_MARKETING_SERVICE', 'toolMarketing.getById', { id });
    }

    @Get('slug/:slug')
    @Public()
    @ApiOperation({ summary: 'Get tool marketing by slug' })
    @ApiParam({ name: 'slug', description: 'Tool Marketing slug' })
    @ApiResponse({ status: 200, description: 'Tool Marketing retrieved' })
    @ApiResponse({ status: 404, description: 'Tool Marketing not found' })
    async getToolMarketingBySlug(@Param('slug') slug: string): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL_MARKETING_SERVICE', 'toolMarketing.getBySlug', { slug });
    }

    @Put(':id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Update tool marketing' })
    @ApiParam({ name: 'id', description: 'Tool Marketing ID' })
    @ApiResponse({ status: 200, description: 'Tool Marketing updated' })
    async updateToolMarketing(
        @Param('id') id: string,
        @Body() body: any,
        @CurrentUser() user: JwtPayload,
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL_MARKETING_SERVICE', 'toolMarketing.update', {
            id,
            ...body,
            updatedBy: user.userId,
        });
    }

    @Delete(':id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Delete tool marketing' })
    @ApiParam({ name: 'id', description: 'Tool Marketing ID' })
    @ApiResponse({ status: 200, description: 'Tool Marketing deleted' })
    async deleteToolMarketing(
        @Param('id') id: string,
        @CurrentUser() user: JwtPayload,
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL_MARKETING_SERVICE', 'toolMarketing.delete', {
            id,
            deletedBy: user.userId,
        });
    }

    // Rating endpoints
    @Post(':id/ratings')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Rate a tool marketing' })
    @ApiParam({ name: 'id', description: 'Tool Marketing ID' })
    @ApiResponse({ status: 201, description: 'Rating created' })
    async rateToolMarketing(
        @Param('id') id: string,
        @Body() body: any,
        @CurrentUser() user: JwtPayload,
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL_MARKETING_SERVICE', 'toolMarketing.rate', {
            toolMarketingId: id,
            userId: user.userId,
            createdBy: user.userId,
            ...body,
        });
    }

    @Get(':id/ratings')
    @Public()
    @ApiOperation({ summary: 'Get tool marketing ratings' })
    @ApiParam({ name: 'id', description: 'Tool Marketing ID' })
    @ApiQuery({ name: 'skip', required: false, type: Number })
    @ApiQuery({ name: 'take', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Ratings retrieved' })
    async getToolMarketingRatings(
        @Param('id') id: string,
        @Query('skip') skip?: string,
        @Query('take') take?: string,
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL_MARKETING_SERVICE', 'toolMarketing.getRatings', {
            toolMarketingId: id,
            skip: parseInt(skip || '0'),
            take: parseInt(take || '10'),
        });
    }

    @Get(':id/ratings/average')
    @Public()
    @ApiOperation({ summary: 'Get average rating for tool marketing' })
    @ApiParam({ name: 'id', description: 'Tool Marketing ID' })
    @ApiResponse({ status: 200, description: 'Average rating retrieved' })
    async getAverageRating(@Param('id') id: string): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL_MARKETING_SERVICE', 'toolMarketing.getAverageRating', {
            toolMarketingId: id,
        });
    }

    @Post('use')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Mark tool marketing as used', operationId: 'markToolMarketingAsUsed' })
    @ApiBody({
        description: 'Tool marketing usage data',
        schema: {
            type: 'object',
            properties: {
                toolMarketingId: { type: 'string', example: 'tool-marketing-123', description: 'Tool Marketing ID' },
            },
            required: ['toolMarketingId'],
        },
    })
    @ApiResponse({ status: 200, description: 'Tool marketing marked as used successfully' })
    @ApiResponse({ status: 404, description: 'Tool marketing not found' })
    async markToolMarketingAsUsed(
        @Body() body: { toolMarketingId: string },
        @CurrentUser() user: JwtPayload,
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL_MARKETING_SERVICE', 'toolMarketing.use', {
            userId: user.userId,
            toolMarketingId: body.toolMarketingId,
        });
    }

    @Post('save')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Save or unsave a tool marketing', operationId: 'toggleSaveToolMarketing' })
    @ApiBody({
        description: 'Tool marketing save data',
        schema: {
            type: 'object',
            properties: {
                toolMarketingId: { type: 'string', example: 'tool-marketing-123', description: 'Tool Marketing ID' },
            },
            required: ['toolMarketingId'],
        },
    })
    @ApiResponse({ status: 200, description: 'Tool marketing save status toggled successfully' })
    @ApiResponse({ status: 404, description: 'Tool marketing not found' })
    async toggleSaveToolMarketing(
        @Body() body: { toolMarketingId: string },
        @CurrentUser() user: JwtPayload,
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL_MARKETING_SERVICE', 'toolMarketing.save', {
            userId: user.userId,
            toolMarketingId: body.toolMarketingId,
        });
    }

    @Get('used')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get user\'s used tool marketings', operationId: 'getUserUsedToolMarketings' })
    @ApiQuery({ name: 'pageNo', required: false, type: Number, description: 'Page number (default: 0)' })
    @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Page size (default: 10)' })
    @ApiResponse({ status: 200, description: 'User used tool marketings retrieved successfully' })
    async getUserUsedToolMarketings(
        @Query('pageNo') pageNo: number = 0,
        @Query('pageSize') pageSize: number = 10,
        @CurrentUser() user: JwtPayload,
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL_MARKETING_SERVICE', 'toolMarketing.get-used', {
            userId: user.userId,
            pageNo: Number(pageNo),
            pageSize: Number(pageSize),
        });
    }

    @Get('saved')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get user\'s saved tool marketings', operationId: 'getUserSavedToolMarketings' })
    @ApiQuery({ name: 'pageNo', required: false, type: Number, description: 'Page number (default: 0)' })
    @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Page size (default: 10)' })
    @ApiResponse({ status: 200, description: 'User saved tool marketings retrieved successfully' })
    async getUserSavedToolMarketings(
        @Query('pageNo') pageNo: number = 0,
        @Query('pageSize') pageSize: number = 10,
        @CurrentUser() user: JwtPayload,
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL_MARKETING_SERVICE', 'toolMarketing.get-saved', {
            userId: user.userId,
            pageNo: Number(pageNo),
            pageSize: Number(pageSize),
        });
    }
}

