import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile, Inject, Headers, Req } from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ApiGatewayService } from '../services/api-gateway.service';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBearerAuth, ApiBody, ApiHeader, ApiConsumes } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../decorators';
import { Role } from '@app/shared/enum/user.enum';
import type { JwtPayload } from '@app/shared/interface.ts/user.interface';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
    constructor(
        private readonly apiGateway: ApiGatewayService,
        @Inject('MEDIA_CLIENT') private readonly mediaClient: ClientProxy,
    ) { }

    // ===== USER MANAGEMENT =====

    @Get('users')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get all users with pagination and filters' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (0-based)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
    @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by username, email, or name' })
    @ApiQuery({ name: 'role', required: false, enum: Role, description: 'Filter by role' })
    @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by status' })
    @ApiQuery({ name: 'deleted', required: false, type: Boolean, description: 'Filter deleted users (true/false)' })
    @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
    async getUsers(@Query() query: any): Promise<unknown> {
        // Map common query params (page, limit) to the microservice expected names
        // and ensure numeric types so downstream services don't error.
        const payload: any = { ...query };

        if (payload.page !== undefined && payload.page !== null) {
            const p = parseInt(String(payload.page), 10);
            if (!Number.isNaN(p)) {
                payload.pageNo = p;
            }
            delete payload.page;
        }

        if (payload.limit !== undefined && payload.limit !== null) {
            const l = parseInt(String(payload.limit), 10);
            if (!Number.isNaN(l)) {
                payload.pageSize = l;
            }
            delete payload.limit;
        }

        // Convert deleted string to boolean
        if (payload.deleted !== undefined && payload.deleted !== null) {
            payload.deleted = payload.deleted === 'true' || payload.deleted === true;
        }

        return this.apiGateway.forwardToService('AUTH', 'admin.getUsers', payload);
    }

    @Get('users/:id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get user by ID' })
    @ApiParam({ name: 'id', description: 'User ID' })
    @ApiResponse({ status: 200, description: 'User retrieved successfully' })
    async getUserById(@Param('id') id: string): Promise<unknown> {
        return this.apiGateway.forwardToService('AUTH', 'admin.getUser', { userId: id });
    }

    @Post('users')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Create a new user (admin only)' })
    @ApiBody({
        description: 'User creation data',
        schema: {
            type: 'object',
            required: ['username', 'email', 'password', 'name', 'role'],
            properties: {
                username: {
                    type: 'string',
                    description: 'Unique username',
                    example: 'john_doe'
                },
                email: {
                    type: 'string',
                    format: 'email',
                    description: 'User email address',
                    example: 'john@example.com'
                },
                password: {
                    type: 'string',
                    description: 'User password (minimum 6 characters)',
                    example: 'SecurePass123'
                },
                name: {
                    type: 'string',
                    description: 'Full name',
                    example: 'John Doe'
                },
                phone: {
                    type: 'string',
                    description: 'Phone number (optional)',
                    example: '0123456789'
                },
                role: {
                    type: 'string',
                    enum: ['USER', 'ADMIN', 'SUPPORT'],
                    description: 'User role',
                    example: 'USER'
                },
                status: {
                    type: 'string',
                    enum: ['ACTIVE', 'INACTIVE'],
                    description: 'User status (default: ACTIVE)',
                    example: 'ACTIVE'
                },
                canPost: {
                    type: 'boolean',
                    description: 'Whether user can create posts (default: false)',
                    example: false
                }
            }
        }
    })
    @ApiResponse({ status: 201, description: 'User created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input or user already exists' })
    async createUser(@Body() body: any, @CurrentUser() currentUser: any): Promise<unknown> {
        return this.apiGateway.forwardToService('AUTH', 'admin.createUser', { ...body, createdBy: currentUser.userId });
    }

    @Put('users/:id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Update user' })
    @ApiParam({ name: 'id', description: 'User ID' })
    @ApiBody({
        description: 'User update data',
        schema: {
            type: 'object',
            properties: {
                role: {
                    type: 'string',
                    enum: ['USER', 'ADMIN', 'SUPPORT'],
                    description: 'User role'
                },
                status: {
                    type: 'string',
                    enum: ['ACTIVE', 'INACTIVE', 'BANNED'],
                    description: 'User status'
                },
                emailVerified: {
                    type: 'boolean',
                    description: 'Email verification status'
                },
                phone: {
                    type: 'string',
                    description: 'Phone number'
                },
                name: {
                    type: 'string',
                    description: 'Full name'
                },
                bio: {
                    type: 'string',
                    description: 'User biography'
                },
                canPost: {
                    type: 'boolean',
                    description: 'Whether user can create posts'
                },
                password: {
                    type: 'string',
                    description: 'Set a new password (admin override)',
                    minLength: 6,
                }
            }
        }
    })
    @ApiResponse({ status: 200, description: 'User updated successfully' })
    async updateUser(@Param('id') id: string, @Body() body: any, @CurrentUser() currentUser: any): Promise<unknown> {
        return this.apiGateway.forwardToService('AUTH', 'admin.updateUser', { userId: id, updatedBy: currentUser.userId, ...body });
    }

    @Delete('users/:id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Delete user (soft delete)' })
    @ApiParam({ name: 'id', description: 'User ID' })
    @ApiResponse({ status: 200, description: 'User deleted successfully' })
    async deleteUser(@Param('id') id: string, @CurrentUser() currentUser: any): Promise<unknown> {
        return this.apiGateway.forwardToService('AUTH', 'admin.deleteUser', { userId: id, deletedBy: currentUser.userId });
    }

    // ===== TOOL MANAGEMENT =====

    @Get('tools')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get all tools with pagination and filters' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiQuery({ name: 'status', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Tools retrieved successfully' })
    async getTools(@Query() query: any): Promise<unknown> {
        // Map common query params (page, limit) to the microservice expected names
        // and ensure numeric types so downstream services don't error.
        const payload: any = { ...query };

        if (payload.page !== undefined && payload.page !== null) {
            const p = parseInt(String(payload.page), 10);
            if (!Number.isNaN(p)) {
                payload.pageNo = p;
            }
            delete payload.page;
        }

        if (payload.limit !== undefined && payload.limit !== null) {
            const l = parseInt(String(payload.limit), 10);
            if (!Number.isNaN(l)) {
                payload.pageSize = l;
            }
            delete payload.limit;
        }

        return this.apiGateway.forwardToService('TOOL', 'admin.getTools', payload);
    }

    @Get('tools/:id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get tool by ID' })
    @ApiParam({ name: 'id', description: 'Tool ID' })
    @ApiResponse({ status: 200, description: 'Tool retrieved successfully' })
    async getToolById(@Param('id') id: string): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL', 'admin.getTool', { toolId: id });
    }

    @Put('tools/:id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Update tool (auto-updates updatedAt and updatedBy)' })
    @ApiParam({ name: 'id', description: 'Tool ID' })
    @ApiBody({
        description: 'Tool update data',
        schema: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'Tool name',
                    example: 'ChatGPT'
                },
                description: {
                    type: 'string',
                    description: 'Tool description',
                    example: 'Advanced AI language model'
                },
                slug: {
                    type: 'string',
                    description: 'URL-friendly slug',
                    example: 'chatgpt'
                },
                homepageUrl: {
                    type: 'string',
                    description: 'Tool homepage URL',
                    example: 'https://chat.openai.com'
                },
                logoUrl: {
                    type: 'string',
                    description: 'Tool logo URL',
                    example: 'https://example.com/logo.png'
                },
                shortDesc: {
                    type: 'string',
                    description: 'Short description',
                    example: 'An AI chatbot'
                },
                longDesc: {
                    type: 'string',
                    description: 'Long description',
                    example: 'Detailed description here'
                },
                status: {
                    type: 'integer',
                    description: 'Tool status (1: active, 0: inactive)',
                    example: 1
                },
                bodyHtml: {
                    type: 'string',
                    description: 'Tool details in HTML format',
                    example: '<p>Tool details</p>'
                },
                seo: {
                    type: 'object',
                    description: 'SEO metadata',
                    example: { title: 'ChatGPT', description: 'AI tool', keywords: ['ai', 'chat'] }
                },
                priceId: {
                    type: 'string',
                    description: 'Price ID reference',
                    example: 'price-123'
                }
            }
        }
    })
    @ApiResponse({ status: 200, description: 'Tool updated successfully with updatedAt and updatedBy tracked' })
    async updateTool(@Param('id') id: string, @Body() body: any, @CurrentUser() currentUser: any): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL', 'admin.updateTool', { toolId: id, updatedBy: currentUser.userId, ...body });
    }

    @Delete('tools/:id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Delete tool (soft delete - updates deletedAt and deletedBy)' })
    @ApiParam({ name: 'id', description: 'Tool ID' })
    @ApiResponse({ status: 200, description: 'Tool deleted successfully with deletedAt and deletedBy tracked' })
    async deleteTool(@Param('id') id: string, @CurrentUser() currentUser: any): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL', 'admin.deleteTool', { toolId: id, deletedBy: currentUser.userId });
    }

    // ===== CONTENT MANAGEMENT =====

    @Get('content')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get all content with pagination and filters' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiQuery({ name: 'type', required: false, type: String })
    @ApiQuery({ name: 'status', required: false, type: String })
    @ApiResponse({ status: 200, description: 'Content retrieved successfully' })
    async getContent(@Query() query: any): Promise<unknown> {
        // Map common query params (page, limit) to the microservice expected names
        // and ensure numeric types so downstream services don't error.
        const payload: any = { ...query };

        if (payload.page !== undefined && payload.page !== null) {
            const p = parseInt(String(payload.page), 10);
            if (!Number.isNaN(p)) {
                payload.pageNo = p;
            }
            delete payload.page;
        }

        if (payload.limit !== undefined && payload.limit !== null) {
            const l = parseInt(String(payload.limit), 10);
            if (!Number.isNaN(l)) {
                payload.pageSize = l;
            }
            delete payload.limit;
        }

        return this.apiGateway.forwardToService('BLOG', 'admin.getContent', payload);
    }

    @Get('content/:id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get content by ID' })
    @ApiParam({ name: 'id', description: 'Content ID' })
    @ApiResponse({ status: 200, description: 'Content retrieved successfully' })
    async getContentById(@Param('id') id: string): Promise<unknown> {
        return this.apiGateway.forwardToService('BLOG', 'admin.getContent', { contentId: id });
    }

    @Put('content/:id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Update content' })
    @ApiParam({ name: 'id', description: 'Content ID' })
    @ApiResponse({ status: 200, description: 'Content updated successfully' })
    async updateContent(@Param('id') id: string, @Body() body: any): Promise<unknown> {
        return this.apiGateway.forwardToService('BLOG', 'admin.updateContent', { contentId: id, ...body });
    }

    @Delete('content/:id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Delete content' })
    @ApiParam({ name: 'id', description: 'Content ID' })
    @ApiResponse({ status: 200, description: 'Content deleted successfully' })
    async deleteContent(@Param('id') id: string): Promise<unknown> {
        return this.apiGateway.forwardToService('BLOG', 'admin.deleteContent', { contentId: id });
    }

    // ===== POSTS MANAGEMENT =====

    @Get('posts')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get all posts with pagination and filters' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiQuery({ name: 'status', required: false, type: String })
    @ApiResponse({ status: 200, description: 'Posts retrieved successfully' })
    async getPosts(@Query() query: any): Promise<unknown> {
        // Map common query params (page, limit) to the microservice expected names
        const payload: any = { ...query };

        if (payload.page !== undefined && payload.page !== null) {
            const p = parseInt(String(payload.page), 10);
            if (!Number.isNaN(p)) {
                payload.pageNo = p;
            }
            delete payload.page;
        }

        if (payload.limit !== undefined && payload.limit !== null) {
            const l = parseInt(String(payload.limit), 10);
            if (!Number.isNaN(l)) {
                payload.pageSize = l;
            }
            delete payload.limit;
        }

        return this.apiGateway.forwardToService('BLOG', 'blog.admin.posts', payload);
    }

    @Get('posts/:id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get post by ID' })
    @ApiParam({ name: 'id', description: 'Post ID' })
    @ApiResponse({ status: 200, description: 'Post retrieved successfully' })
    async getPostById(@Param('id') id: string): Promise<unknown> {
        return this.apiGateway.forwardToService('BLOG', 'blog.getPost', { postId: id });
    }

    @Put('posts/:id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Update post' })
    @ApiParam({ name: 'id', description: 'Post ID' })
    @ApiConsumes('multipart/form-data', 'application/json')
    @ApiHeader({
        name: 'folder-type',
        description: 'Folder type for organizing uploaded files (e.g., blog, user, default)',
        required: false,
        schema: { type: 'string', default: 'blog' }
    })
    @ApiBody({
        description: 'Updated post data (can include file for cover image)',
        schema: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                bodyHtml: { type: 'string' },
                categoryId: { type: 'string' },
                status: { type: 'string' },
                excerpt: { type: 'string' },
                authorName: { type: 'string' },
                publishedAt: { type: 'string' },
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
        },
    })
    @ApiResponse({ status: 200, description: 'Post updated successfully' })
    @UseInterceptors(FileInterceptor('file'))
    async updatePost(
        @Param('id') id: string,
        @Req() req: Request,
        @Headers('folder-type') folderType: string = 'blog',
        @CurrentUser() user: JwtPayload,
        @UploadedFile() file?: Express.Multer.File,
    ): Promise<unknown> {
        // Get body from request (multipart/form-data is parsed by FileInterceptor)
        const body = (req.body || {}) as any;
        
        console.log('[AdminController] Update post request received:', {
            postId: id,
            hasFile: !!file,
            coverImageType: body.coverImageType,
            bodyKeys: Object.keys(body || {}),
            hasSeoFields: Object.keys(body || {}).some(key => key.startsWith('seo[')),
            bodySample: JSON.stringify(body || {}).substring(0, 200),
        });

        let mediaId: string | undefined;
        
        // Upload cover image if provided
        if (file && body.coverImageType) {
            try {
                if (!file.filename) {
                    throw new Error('File filename is missing. Make sure file was uploaded correctly.');
                }

                console.log('[AdminController] Uploading file to media service:', {
                    filename: file.filename,
                    originalName: file.originalname,
                    size: file.size,
                    mimetype: file.mimetype,
                });

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
                console.log('[AdminController] Media upload result:', JSON.stringify(mediaResult, null, 2));

                // Get media ID from upload response
                mediaId = mediaResult?.id;
                if (mediaId) {
                    console.log('[AdminController] Using new Media ID:', mediaId);
                } else {
                    console.error('[AdminController] Media ID not found in response:', mediaResult);
                    throw new Error('Failed to get Media ID from upload response');
                }
            } catch (error) {
                console.error('[AdminController] Error uploading media:', error);
                throw error;
            }
        }

        // Remove file-related fields from body before forwarding
        const updateBody: any = { ...body };
        delete updateBody.file;
        delete updateBody.coverImageType;

        // Parse SEO data from flat format (seo[metaTitle], seo[metaDescription], etc.)
        let seoData: any = undefined;
        if (updateBody.seo) {
            // If seo is already an object (from JSON parsing)
            seoData = typeof updateBody.seo === 'string' ? JSON.parse(updateBody.seo) : updateBody.seo;
        } else {
            // Parse from flat form fields: seo[metaTitle], seo[metaDescription], etc.
            const seoFields: any = {};
            Object.keys(updateBody || {}).forEach(key => {
                if (key.startsWith('seo[') && key.endsWith(']')) {
                    const fieldName = key.slice(4, -1); // Remove 'seo[' and ']'
                    seoFields[fieldName] = updateBody[key];
                    delete updateBody[key];
                }
            });
            
            // Parse secondaryKeywords if it's a string
            if (seoFields.secondaryKeywords) {
                if (typeof seoFields.secondaryKeywords === 'string') {
                    try {
                        seoFields.secondaryKeywords = JSON.parse(seoFields.secondaryKeywords);
                    } catch {
                        // If not JSON, treat as comma-separated string
                        seoFields.secondaryKeywords = seoFields.secondaryKeywords.split(',').map((k: string) => k.trim()).filter((k: string) => k);
                    }
                }
            }

            // Parse schema if provided (handle both seo[schema[...]] and schema][...] formats)
            const schemaKeys = Object.keys(seoFields).filter(key => 
                key.includes('schema') && (key.includes('[') || key.includes(']'))
            );
            
            if (schemaKeys.length > 0) {
                seoFields.schema = seoFields.schema || {};
                
                schemaKeys.forEach(key => {
                    let schemaType: string | null = null;
                    let value = seoFields[key];
                    
                    // Handle seo[schema[article]], seo[schema[faqPage]], seo[schema[definedTerm]]
                    if (key.startsWith('schema[article]') || key.includes('schema[article]')) {
                        schemaType = 'article';
                    } else if (key.startsWith('schema[faqPage]') || key.includes('schema[faqPage]')) {
                        schemaType = 'faqPage';
                    } else if (key.startsWith('schema[definedTerm]') || key.includes('schema[definedTerm]')) {
                        schemaType = 'definedTerm';
                    }
                    // Handle malformed keys like "schema][definedTerm" or "schema][faqPage"
                    else if (key.includes('schema][definedTerm')) {
                        schemaType = 'definedTerm';
                    } else if (key.includes('schema][faqPage')) {
                        schemaType = 'faqPage';
                    } else if (key.includes('schema][article')) {
                        schemaType = 'article';
                    }
                    
                    if (schemaType && value) {
                        seoFields.schema[schemaType] = typeof value === 'string' 
                            ? JSON.parse(value) 
                            : value;
                        delete seoFields[key];
                    }
                });
            }

            if (Object.keys(seoFields).length > 0) {
                seoData = seoFields;
            }
        }

        const updateData: any = {
            ...updateBody,
        };

        // Ensure metadata fields are included
        if (updateBody.excerpt !== undefined) {
            updateData.excerpt = updateBody.excerpt;
        }
        if (updateBody.authorName !== undefined) {
            updateData.authorName = updateBody.authorName;
        }
        if (updateBody.publishedAt !== undefined) {
            updateData.publishedAt = updateBody.publishedAt;
        }
        if (updateBody.locale !== undefined) {
            updateData.locale = updateBody.locale;
        }
        if (updateBody.slug !== undefined) {
            updateData.slug = updateBody.slug;
        }

        // Add mediaId if file was uploaded
        if (mediaId) {
            updateData.coverImageId = mediaId;
        }

        if (seoData) {
            updateData.seo = seoData;
        }

        console.log('[AdminController] Update post:', {
            postId: id,
            hasSeo: !!seoData,
            hasMediaId: !!mediaId,
            seoKeys: seoData ? Object.keys(seoData) : [],
            updateDataKeys: Object.keys(updateData || {}),
            excerpt: updateData.excerpt,
            authorName: updateData.authorName,
            publishedAt: updateData.publishedAt,
            slug: updateData.slug,
        });

        return this.apiGateway.forwardToService('BLOG', 'blog.updatePost', { postId: id, ...updateData });
    }

    @Delete('posts/:id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Delete post (soft delete)' })
    @ApiParam({ name: 'id', description: 'Post ID' })
    @ApiResponse({ status: 200, description: 'Post deleted successfully (soft delete)' })
    async deletePost(@Param('id') id: string, @CurrentUser() currentUser: JwtPayload): Promise<unknown> {
        return this.apiGateway.forwardToService('BLOG', 'blog.post.delete', { 
            id, 
            deletedBy: currentUser?.userId 
        });
    }

    @Post('posts/:id/publish')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Publish post to PUBLISHED status and send notifications to followers' })
    @ApiParam({ name: 'id', description: 'Post ID' })
    @ApiResponse({ status: 200, description: 'Post published successfully and notifications sent' })
    @ApiResponse({ status: 404, description: 'Post not found' })
    async publishPost(@Param('id') id: string): Promise<unknown> {
        return this.apiGateway.forwardToService('BLOG', 'admin.publishPost', { postId: id });
    }

    // ===== MEDIA MANAGEMENT =====

    @Get('media')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get all media with pagination and filters' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiQuery({ name: 'type', required: false, type: String })
    @ApiResponse({ status: 200, description: 'Media retrieved successfully' })
    async getMedia(@Query() query: any): Promise<unknown> {
        // Map common query params (page, limit) to the microservice expected names
        // and ensure numeric types so downstream services don't error.
        const payload: any = { ...query };

        if (payload.page !== undefined && payload.page !== null) {
            const p = parseInt(String(payload.page), 10);
            if (!Number.isNaN(p)) {
                payload.pageNo = p;
            }
            delete payload.page;
        }

        if (payload.limit !== undefined && payload.limit !== null) {
            const l = parseInt(String(payload.limit), 10);
            if (!Number.isNaN(l)) {
                payload.pageSize = l;
            }
            delete payload.limit;
        }

        return this.apiGateway.forwardToService('MEDIA', 'admin.getMedia', payload);
    }

    @Delete('media/:id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Delete media' })
    @ApiParam({ name: 'id', description: 'Media ID' })
    @ApiResponse({ status: 200, description: 'Media deleted successfully' })
    async deleteMedia(@Param('id') id: string): Promise<unknown> {
        return this.apiGateway.forwardToService('MEDIA', 'admin.deleteMedia', { mediaId: id });
    }

    // ===== NOTIFICATION MANAGEMENT =====

    @Get('notifications')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get all notifications with pagination and filters' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'userId', required: false, type: String })
    @ApiQuery({ name: 'type', required: false, type: String })
    @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
    async getNotifications(@Query() query: any): Promise<unknown> {
        // Map common query params (page, limit) to the microservice expected names
        // and ensure numeric types so downstream services don't error.
        const payload: any = { ...query };

        if (payload.page !== undefined && payload.page !== null) {
            const p = parseInt(String(payload.page), 10);
            if (!Number.isNaN(p)) {
                payload.pageNo = p;
            }
            delete payload.page;
        }

        if (payload.limit !== undefined && payload.limit !== null) {
            const l = parseInt(String(payload.limit), 10);
            if (!Number.isNaN(l)) {
                payload.pageSize = l;
            }
            delete payload.limit;
        }

        return this.apiGateway.forwardToService('NOTIFICATION', 'admin.getNotifications', payload);
    }

    @Post('notifications')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Create broadcast notification' })
    @ApiResponse({ status: 201, description: 'Notification created successfully' })
    async createNotification(@Body() body: any): Promise<unknown> {
        return this.apiGateway.forwardToService('NOTIFICATION', 'admin.createNotification', body);
    }

    // ===== SUPPORT TICKET MANAGEMENT =====

    @Get('support-tickets')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get all support tickets with pagination and filters' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'status', required: false, type: String })
    @ApiQuery({ name: 'priority', required: false, type: String })
    @ApiResponse({ status: 200, description: 'Support tickets retrieved successfully' })
    async getSupportTickets(@Query() query: any): Promise<unknown> {
        // Map common query params (page, limit) to the microservice expected names
        // and ensure numeric types so downstream services don't error.
        const payload: any = { ...query };

        if (payload.page !== undefined && payload.page !== null) {
            const p = parseInt(String(payload.page), 10);
            if (!Number.isNaN(p)) {
                payload.pageNo = p;
            }
            delete payload.page;
        }

        if (payload.limit !== undefined && payload.limit !== null) {
            const l = parseInt(String(payload.limit), 10);
            if (!Number.isNaN(l)) {
                payload.pageSize = l;
            }
            delete payload.limit;
        }

        return this.apiGateway.forwardToService('NOTIFICATION', 'admin.getSupportTickets', payload); // Assuming notification service handles support
    }

    @Put('support-tickets/:id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Update support ticket' })
    @ApiParam({ name: 'id', description: 'Ticket ID' })
    @ApiResponse({ status: 200, description: 'Support ticket updated successfully' })
    async updateSupportTicket(@Param('id') id: string, @Body() body: any): Promise<unknown> {
        return this.apiGateway.forwardToService('NOTIFICATION', 'admin.updateSupportTicket', { ticketId: id, ...body });
    }

    // ===== POST ANALYTICS =====



    @Get('analytics/posts/:postId')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get analytics for a specific post' })
    @ApiParam({ name: 'postId', description: 'Post ID' })
    @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start datetime (format: YYYY-MM-DD HH:mm:ss). Backend does NOT auto-convert 00:00 or 23:59, you must provide exact time range.', example: '2025-11-13 08:39:39' })
    @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End datetime (format: YYYY-MM-DD HH:mm:ss). Backend does NOT auto-convert 00:00 or 23:59, you must provide exact time range.', example: '2025-11-14 08:39:39' })
    @ApiResponse({ status: 200, description: 'Post analytics retrieved successfully' })
    async getPostAnalytics(
        @Param('postId') postId: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ): Promise<unknown> {

        return this.apiGateway.forwardToService('BLOG', 'admin.getPostAnalytics', {
            postId,
            startDate: startDate,
            endDate: endDate
        });
    }

    @Get('analytics/posts')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get analytics for all posts' })
    @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start datetime (format: YYYY-MM-DD HH:mm:ss). Backend does NOT auto-convert 00:00 or 23:59, you must provide exact time range.', example: '2025-11-13 08:39:39' })
    @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End datetime (format: YYYY-MM-DD HH:mm:ss). Backend does NOT auto-convert 00:00 or 23:59, you must provide exact time range.', example: '2025-11-14 08:39:39' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of posts (default: 20)', example: 20 })
    @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Offset for pagination (default: 0)', example: 0 })
    @ApiResponse({ status: 200, description: 'Multi-post analytics retrieved successfully' })
    async getMultiPostAnalytics(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ): Promise<unknown> {

        const payload: any = {
            startDate: startDate,
            endDate: endDate
        };

        if (limit) {
            payload.limit = Math.min(parseInt(limit, 10), 100); // Cap at 100
        }

        if (offset) {
            payload.offset = Math.max(parseInt(offset, 10), 0);
        }

        return this.apiGateway.forwardToService('BLOG', 'admin.getMultiPostAnalytics', payload);
    }

    @Get('analytics/posts/trending/top')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get top posts by engagement' })
    @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start datetime (format: YYYY-MM-DD HH:mm:ss). Backend does NOT auto-convert 00:00 or 23:59, you must provide exact time range.', example: '2025-11-13 08:39:39' })
    @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End datetime (format: YYYY-MM-DD HH:mm:ss). Backend does NOT auto-convert 00:00 or 23:59, you must provide exact time range.', example: '2025-11-14 08:39:39' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of top posts (default: 10)', example: 10 })
    @ApiResponse({ status: 200, description: 'Top posts by engagement retrieved successfully' })
    async getTopPostsByEngagement(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('limit') limit?: string,
    ): Promise<unknown> {

        const payload: any = {
            startDate: startDate,
            endDate: endDate
        };

        if (limit) {
            payload.limit = Math.min(parseInt(limit, 10), 100);
        }

        return this.apiGateway.forwardToService('BLOG', 'admin.getTopPostsByEngagement', payload);
    }

    @Get('analytics/posts/:postId/trend')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get analytics trend for a post (daily breakdown)' })
    @ApiParam({ name: 'postId', description: 'Post ID' })
    @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start datetime (format: YYYY-MM-DD HH:mm:ss). Backend does NOT auto-convert 00:00 or 23:59, you must provide exact time range.', example: '2025-11-13 08:39:39' })
    @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End datetime (format: YYYY-MM-DD HH:mm:ss). Backend does NOT auto-convert 00:00 or 23:59, you must provide exact time range.', example: '2025-11-14 08:39:39' })
    @ApiResponse({ status: 200, description: 'Post analytics trend retrieved successfully' })
    async getPostAnalyticsTrend(
        @Param('postId') postId: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ): Promise<unknown> {

        return this.apiGateway.forwardToService('BLOG', 'admin.getPostAnalyticsTrend', {
            postId,
            startDate: startDate,
            endDate: endDate
        });
    }

    @Get('analytics/overview')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get overall analytics for ALL posts (total comments, reactions, shares, views)' })
    @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start datetime (format: YYYY-MM-DD HH:mm:ss). Backend does NOT auto-convert 00:00 or 23:59, you must provide exact time range.', example: '2025-11-13 08:39:39' })
    @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End datetime (format: YYYY-MM-DD HH:mm:ss). Backend does NOT auto-convert 00:00 or 23:59, you must provide exact time range.', example: '2025-11-14 08:39:39' })
    @ApiResponse({ status: 200, description: 'Overall analytics retrieved successfully' })
    async getOverallAnalytics(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('BLOG', 'admin.getOverallAnalytics', {
            startDate: startDate,
            endDate: endDate,
        });
    }

    // ===== TAG MANAGEMENT (UPDATE/DELETE) =====

    @Put('tags/:id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Update a tag (auto-updates updatedAt and updatedBy)' })
    @ApiParam({ name: 'id', description: 'Tag ID' })
    @ApiBody({
        description: 'Tag update data',
        schema: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'New tag name',
                    example: 'Artificial Intelligence'
                }
            },
            required: ['name']
        }
    })
    @ApiResponse({ status: 200, description: 'Tag updated successfully with updatedAt and updatedBy tracked' })
    @ApiResponse({ status: 401, description: 'Unauthorized - Admin access required' })
    @ApiResponse({ status: 404, description: 'Tag not found' })
    @ApiResponse({ status: 409, description: 'Tag name already exists' })
    async updateTag(@Param('id') id: string, @Body() body: any, @CurrentUser() currentUser: any): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL', 'tag.update', {
            id,
            name: body.name,
            userId: currentUser.userId
        });
    }

    @Delete('tags/:id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Delete a tag (soft delete - updates deletedAt and deletedBy)' })
    @ApiParam({ name: 'id', description: 'Tag ID' })
    @ApiResponse({ status: 200, description: 'Tag deleted successfully with deletedAt and deletedBy tracked' })
    @ApiResponse({ status: 401, description: 'Unauthorized - Admin access required' })
    @ApiResponse({ status: 404, description: 'Tag not found' })
    async deleteTag(@Param('id') id: string, @CurrentUser() currentUser: any): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL', 'tag.delete', {
            id,
            userId: currentUser.userId
        });
    }

    // ===== PRICE MANAGEMENT (UPDATE/DELETE) =====

    @Put('prices/:id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Update a price (auto-updates updatedAt and updatedBy)' })
    @ApiParam({ name: 'id', description: 'Price ID' })
    @ApiBody({
        description: 'Price update data',
        schema: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'New price name',
                    example: 'Premium'
                }
            },
            required: ['name']
        }
    })
    @ApiResponse({ status: 200, description: 'Price updated successfully with updatedAt and updatedBy tracked' })
    @ApiResponse({ status: 401, description: 'Unauthorized - Admin access required' })
    @ApiResponse({ status: 404, description: 'Price not found' })
    @ApiResponse({ status: 409, description: 'Price name already exists' })
    async updatePrice(@Param('id') id: string, @Body() body: any, @CurrentUser() currentUser: any): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL', 'price.update', {
            id,
            name: body.name,
            userId: currentUser.userId
        });
    }

    @Delete('prices/:id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Delete a price (soft delete - updates deletedAt and deletedBy)' })
    @ApiParam({ name: 'id', description: 'Price ID' })
    @ApiResponse({ status: 200, description: 'Price deleted successfully with deletedAt and deletedBy tracked' })
    @ApiResponse({ status: 401, description: 'Unauthorized - Admin access required' })
    @ApiResponse({ status: 404, description: 'Price not found' })
    async deletePrice(@Param('id') id: string, @CurrentUser() currentUser: any): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL', 'price.delete', {
            id,
            userId: currentUser.userId
        });
    }

    // ===== AUDIENCE MANAGEMENT (UPDATE/DELETE) =====

    @Put('audiences/:id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Update an audience (auto-updates updatedAt and updatedBy)' })
    @ApiParam({ name: 'id', description: 'Audience ID' })
    @ApiBody({
        description: 'Audience update data',
        schema: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'New audience name',
                    example: 'Advanced Users'
                }
            },
            required: ['name']
        }
    })
    @ApiResponse({ status: 200, description: 'Audience updated successfully with updatedAt and updatedBy tracked' })
    @ApiResponse({ status: 401, description: 'Unauthorized - Admin access required' })
    @ApiResponse({ status: 404, description: 'Audience not found' })
    @ApiResponse({ status: 409, description: 'Audience name already exists' })
    async updateAudience(@Param('id') id: string, @Body() body: any, @CurrentUser() currentUser: any): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL', 'audience.update', {
            id,
            name: body.name,
            userId: currentUser.userId
        });
    }

    @Delete('audiences/:id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Delete an audience (soft delete - updates deletedAt and deletedBy)' })
    @ApiParam({ name: 'id', description: 'Audience ID' })
    @ApiResponse({ status: 200, description: 'Audience deleted successfully with deletedAt and deletedBy tracked' })
    @ApiResponse({ status: 401, description: 'Unauthorized - Admin access required' })
    @ApiResponse({ status: 404, description: 'Audience not found' })
    async deleteAudience(@Param('id') id: string, @CurrentUser() currentUser: any): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL', 'audience.delete', {
            id,
            userId: currentUser.userId
        });
    }

    // ===== STATISTICS =====

    @Get('statistics')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get platform statistics (posts, tools, users count)' })
    @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (YYYY-MM-DD format). Default: Jan 1 of current year' })
    @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (YYYY-MM-DD format). Default: Dec 31 of current year' })
    @ApiResponse({ status: 200, description: 'Statistics retrieved successfully', schema: { type: 'object', properties: { postsCount: { type: 'number' }, toolsCount: { type: 'number' }, usersCount: { type: 'number' }, period: { type: 'object', properties: { startDate: { type: 'string' }, endDate: { type: 'string' } } } } } })
    @ApiResponse({ status: 401, description: 'Unauthorized - Admin access required' })
    @ApiResponse({ status: 400, description: 'Invalid date range' })
    async getStatistics(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('ADMIN', 'admin.getStatistics', {
            startDate,
            endDate,
        });
    }

    // ===== COURSE MANAGEMENT =====

    @Get('courses')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get all courses with pagination and filters' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiQuery({ name: 'status', required: false, type: String })
    @ApiResponse({ status: 200, description: 'Courses retrieved successfully' })
    async getCourses(@Query() query: any): Promise<unknown> {
        const payload: any = { ...query };

        if (payload.page !== undefined && payload.page !== null) {
            const p = parseInt(String(payload.page), 10);
            if (!Number.isNaN(p)) {
                payload.pageNo = p;
            }
            delete payload.page;
        }

        if (payload.limit !== undefined && payload.limit !== null) {
            const l = parseInt(String(payload.limit), 10);
            if (!Number.isNaN(l)) {
                payload.pageSize = l;
            }
            delete payload.limit;
        }

        return this.apiGateway.forwardToService('COURSE', 'admin.getCourses', payload);
    }

    @Post('courses')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Create a new course' })
    @ApiBody({
        description: 'Course creation data',
        schema: {
            type: 'object',
            properties: {
                title: { type: 'string', example: 'Advanced TypeScript Fundamentals' },
                shortDesc: { type: 'string', example: 'Short description' },
                description: { type: 'string', example: 'Full description' },
                priceId: { type: 'string', example: 'price-id-123' },
                categoryId: { type: 'string', example: 'category-id-456', nullable: true },
                bodyHtml: { type: 'string', example: '<h1>Course</h1><p>Content</p>' },
                seo: { 
                    type: 'object', 
                    example: { title: 'SEO Title', description: 'SEO Description', keywords: ['keyword1'] },
                    nullable: true
                },
                coverImageId: { type: 'string', example: 'cover-image-id-789', nullable: true },
                isFeatured: { type: 'boolean', example: true },
                link: { type: 'string', example: 'https://example.com/course', nullable: true },
                status: { type: 'string', enum: ['PUBLIC', 'PRIVATE', 'DRAFT'], example: 'PUBLIC' },
            },
            required: ['title', 'priceId'],
        },
    })
    @ApiResponse({ status: 201, description: 'Course created successfully' })
    async createCourse(@Body() body: any, @CurrentUser() currentUser: any): Promise<unknown> {
        // FE đã xử lý coverImageId, dùng trực tiếp như các field khác
        return this.apiGateway.forwardToService('COURSE', 'course.create', {
            ...body,
            createdBy: currentUser.userId,
            // slug will be auto-generated from title in service if not provided
        });
    }

    @Get('courses/:id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get course by ID' })
    @ApiParam({ name: 'id', description: 'Course ID' })
    @ApiResponse({ status: 200, description: 'Course retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Course not found' })
    async getCourseById(@Param('id') id: string): Promise<unknown> {
        return this.apiGateway.forwardToService('COURSE', 'admin.getCourse', { id });
    }

    @Put('courses/:id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Update course' })
    @ApiParam({ name: 'id', description: 'Course ID' })
    @ApiConsumes('multipart/form-data')
    @ApiHeader({
        name: 'folder-type',
        description: 'Folder type for organizing uploaded course files (e.g., course, user, default)',
        required: false,
        schema: { type: 'string', default: 'course' }
    })
    @ApiBody({
        description: 'Course update data (all fields are optional, can upload new cover image)',
        schema: {
            type: 'object',
            properties: {
                title: { type: 'string', example: 'Updated Course Title' },
                shortDesc: { type: 'string', example: 'Updated short description' },
                description: { type: 'string', example: 'Updated full description' },
                bodyHtml: { type: 'string', example: '<h1>Updated Course Content</h1><p>Updated body HTML content</p>' },
                priceId: { type: 'string', example: 'price-id-123' },
                categoryId: { type: 'string', example: 'category-id-456', nullable: true },
                coverImageId: { type: 'string', example: 'cover-image-id-789', nullable: true, description: 'Existing cover image ID (if not uploading new file)' },
                coverImageType: {
                    type: 'string',
                    enum: ['image', 'audio'],
                    description: 'Type of cover image file (required when uploading new file)'
                },
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'New cover image file (optional, will create new coverImageId if provided)',
                },
                slug: { type: 'string', example: 'updated-course-slug', nullable: true, description: 'Custom slug for the course (optional, will be auto-generated from title if not provided)' },
                status: { type: 'string', enum: ['PUBLIC', 'PRIVATE', 'DRAFT'], example: 'PUBLIC' },
                seo: { 
                    type: 'object', 
                    example: { title: 'SEO Title', description: 'SEO Description', keywords: ['keyword1', 'keyword2'] },
                    nullable: true
                },
                isFeatured: { type: 'boolean', example: true },
                link: { type: 'string', example: 'https://example.com/course', nullable: true },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'Course updated successfully' })
    @ApiResponse({ status: 404, description: 'Course not found' })
    @UseInterceptors(FileInterceptor('file'))
    async updateCourse(
        @Param('id') id: string,
        @Body() body: any,
        @Headers('folder-type') folderType: string = 'course',
        @CurrentUser() currentUser: JwtPayload,
        @UploadedFile() file?: Express.Multer.File,
    ): Promise<unknown> {
        console.log('📥 Update Course Request:', {
            id,
            hasFile: !!file,
            coverImageType: body.coverImageType,
            coverImageId: body.coverImageId,
            bodyKeys: Object.keys(body),
        });

        let coverImageId: string | undefined | null = body.coverImageId;

        // Normalize coverImageId: empty string -> undefined, "null" string -> null
        if (coverImageId === '' || coverImageId === 'undefined') {
            coverImageId = undefined;
        } else if (coverImageId === 'null' || coverImageId === null) {
            coverImageId = null;
        }

        // Chỉ xử lý khi có file mới upload
        if (file && body.coverImageType) {
            try {
                if (!file.filename) {
                    throw new Error('File filename is missing. Make sure file was uploaded correctly.');
                }

                console.log('📤 Uploading file to media service:', {
                    filename: file.filename,
                    originalName: file.originalname,
                    size: file.size,
                    mimetype: file.mimetype,
                });

                const mediaResult = await firstValueFrom(
                    this.mediaClient.send(`media.upload.${body.coverImageType}`, {
                        filename: file.filename,
                        originalName: file.originalname,
                        mimeType: file.mimetype,
                        size: file.size,
                        type: body.coverImageType,
                        userId: currentUser.userId,
                        folderType: folderType,
                    }),
                );
                console.log('✅ Media upload result:', JSON.stringify(mediaResult, null, 2));

                // Get media ID from upload response - lưu trực tiếp Media ID
                const mediaId = mediaResult?.id;
                if (mediaId) {
                    coverImageId = mediaId;
                    console.log('✅ Using new Media ID:', coverImageId);
                } else {
                    console.error('❌ Media ID not found in response:', mediaResult);
                    throw new Error('Failed to get Media ID from upload response');
                }
            } catch (error) {
                console.error('❌ Error uploading media:', error);
                throw error; // Throw error để FE biết upload failed
            }
        } else {
            console.log('ℹ️  No new file uploaded, using coverImageId from body:', coverImageId);
        }

        // Remove file-related fields from body before forwarding
        const { file: _, coverImageType: __, ...updateBody } = body;

        // Chỉ truyền coverImageId nếu có giá trị (có thể là string, null để xóa, hoặc undefined để không thay đổi)
        const updatePayload: any = {
            id, 
            updatedBy: currentUser.userId,
            ...updateBody
        };

        // Chỉ thêm coverImageId nếu có giá trị (có thể là string hoặc null để xóa)
        // undefined nghĩa là không thay đổi coverImageId hiện tại
        if (coverImageId !== undefined) {
            updatePayload.coverImageId = coverImageId;
        }

        console.log('📤 Forwarding update payload to COURSE service:', JSON.stringify(updatePayload, null, 2));
        return this.apiGateway.forwardToService('COURSE', 'admin.updateCourse', updatePayload);
    }

    @Delete('courses/:id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Delete course (soft delete)' })
    @ApiParam({ name: 'id', description: 'Course ID' })
    @ApiResponse({ status: 200, description: 'Course deleted successfully' })
    @ApiResponse({ status: 404, description: 'Course not found' })
    async deleteCourse(@Param('id') id: string, @CurrentUser() currentUser: JwtPayload): Promise<unknown> {
        return this.apiGateway.forwardToService('COURSE', 'course.delete', {
            id,
            deletedBy: currentUser.userId,
        });
    }

    // ===== TOOL MARKETING MANAGEMENT =====

    @Get('tool-marketings')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get all tool marketings with pagination and filters' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiQuery({ name: 'status', required: false, type: String })
    @ApiResponse({ status: 200, description: 'Tool marketings retrieved successfully' })
    async getToolMarketings(@Query() query: any): Promise<unknown> {
        const payload: any = { ...query };

        if (payload.page !== undefined && payload.page !== null) {
            const p = parseInt(String(payload.page), 10);
            if (!Number.isNaN(p)) {
                payload.pageNo = p;
            }
            delete payload.page;
        }

        if (payload.limit !== undefined && payload.limit !== null) {
            const l = parseInt(String(payload.limit), 10);
            if (!Number.isNaN(l)) {
                payload.pageSize = l;
            }
            delete payload.limit;
        }

        return this.apiGateway.forwardToService('TOOL_MARKETING_SERVICE', 'admin.getToolMarketings', payload);
    }

    @Post('tool-marketings')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Create a new tool marketing' })
    @ApiBody({
        description: 'Tool Marketing creation data',
        schema: {
            type: 'object',
            properties: {
                title: { type: 'string', example: 'Advanced Marketing Tools' },
                shortDesc: { type: 'string', example: 'Short description' },
                description: { type: 'string', example: 'Full description' },
                priceId: { type: 'string', example: 'price-id-123' },
                categoryId: { type: 'string', example: 'category-id-456', nullable: true },
                bodyHtml: { type: 'string', example: '<h1>Tool Marketing</h1><p>Content</p>' },
                seo: { 
                    type: 'object', 
                    example: { title: 'SEO Title', description: 'SEO Description', keywords: ['keyword1'] },
                    nullable: true
                },
                coverImageId: { type: 'string', example: 'cover-image-id-789', nullable: true },
                isFeatured: { type: 'boolean', example: true },
                link: { type: 'string', example: 'https://example.com/tool-marketing', nullable: true },
                status: { type: 'string', enum: ['PUBLIC', 'PRIVATE', 'DRAFT'], example: 'PUBLIC' },
            },
            required: ['title', 'priceId'],
        },
    })
    @ApiResponse({ status: 201, description: 'Tool marketing created successfully' })
    async createToolMarketing(@Body() body: any, @CurrentUser() currentUser: any): Promise<unknown> {
        // FE đã xử lý coverImageId, dùng trực tiếp như các field khác
        return this.apiGateway.forwardToService('TOOL_MARKETING_SERVICE', 'toolMarketing.create', {
            ...body,
            createdBy: currentUser.userId,
            // slug will be auto-generated from title in service if not provided
        });
    }

    @Get('tool-marketings/:id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get tool marketing by ID' })
    @ApiParam({ name: 'id', description: 'Tool Marketing ID' })
    @ApiResponse({ status: 200, description: 'Tool marketing retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Tool marketing not found' })
    async getToolMarketingById(@Param('id') id: string): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL_MARKETING_SERVICE', 'admin.getToolMarketing', { id });
    }

    @Put('tool-marketings/:id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Update tool marketing' })
    @ApiParam({ name: 'id', description: 'Tool Marketing ID' })
    @ApiConsumes('multipart/form-data')
    @ApiHeader({
        name: 'folder-type',
        description: 'Folder type for organizing uploaded tool marketing files (e.g., tool-marketing, user, default)',
        required: false,
        schema: { type: 'string', default: 'tool-marketing' }
    })
    @ApiBody({
        description: 'Tool Marketing update data (all fields are optional, can upload new cover image)',
        schema: {
            type: 'object',
            properties: {
                title: { type: 'string', example: 'Updated Tool Marketing Title' },
                shortDesc: { type: 'string', example: 'Updated short description' },
                description: { type: 'string', example: 'Updated full description' },
                bodyHtml: { type: 'string', example: '<h1>Updated Tool Marketing Content</h1><p>Updated body HTML content</p>' },
                priceId: { type: 'string', example: 'price-id-123' },
                categoryId: { type: 'string', example: 'category-id-456', nullable: true },
                coverImageId: { type: 'string', example: 'cover-image-id-789', nullable: true, description: 'Existing cover image ID (if not uploading new file)' },
                coverImageType: {
                    type: 'string',
                    enum: ['image', 'audio'],
                    description: 'Type of cover image file (required when uploading new file)'
                },
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'New cover image file (optional, will create new coverImageId if provided)',
                },
                slug: { type: 'string', example: 'updated-tool-marketing-slug', nullable: true, description: 'Custom slug for the tool marketing (optional, will be auto-generated from title if not provided)' },
                status: { type: 'string', enum: ['PUBLIC', 'PRIVATE', 'DRAFT'], example: 'PUBLIC' },
                seo: { 
                    type: 'object', 
                    example: { title: 'SEO Title', description: 'SEO Description', keywords: ['keyword1', 'keyword2'] },
                    nullable: true
                },
                isFeatured: { type: 'boolean', example: true },
                link: { type: 'string', example: 'https://example.com/tool-marketing', nullable: true },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'Tool marketing updated successfully' })
    @ApiResponse({ status: 404, description: 'Tool marketing not found' })
    @UseInterceptors(FileInterceptor('file'))
    async updateToolMarketing(
        @Param('id') id: string,
        @Body() body: any,
        @Headers('folder-type') folderType: string = 'tool-marketing',
        @CurrentUser() currentUser: JwtPayload,
        @UploadedFile() file?: Express.Multer.File,
    ): Promise<unknown> {
        console.log('📥 Update Tool Marketing Request:', {
            id,
            hasFile: !!file,
            coverImageType: body.coverImageType,
            coverImageId: body.coverImageId,
            bodyKeys: Object.keys(body),
        });

        let coverImageId: string | undefined | null = body.coverImageId;

        // Normalize coverImageId: empty string -> undefined, "null" string -> null
        if (coverImageId === '' || coverImageId === 'undefined') {
            coverImageId = undefined;
        } else if (coverImageId === 'null' || coverImageId === null) {
            coverImageId = null;
        }

        // Chỉ xử lý khi có file mới upload
        if (file && body.coverImageType) {
            try {
                if (!file.filename) {
                    throw new Error('File filename is missing. Make sure file was uploaded correctly.');
                }

                console.log('📤 Uploading file to media service:', {
                    filename: file.filename,
                    originalName: file.originalname,
                    size: file.size,
                    mimetype: file.mimetype,
                });

                const mediaResult = await firstValueFrom(
                    this.mediaClient.send(`media.upload.${body.coverImageType}`, {
                        filename: file.filename,
                        originalName: file.originalname,
                        mimeType: file.mimetype,
                        size: file.size,
                        type: body.coverImageType,
                        userId: currentUser.userId,
                        folderType: folderType,
                    }),
                );
                console.log('✅ Media upload result:', JSON.stringify(mediaResult, null, 2));

                // Get media ID from upload response - lưu trực tiếp Media ID
                const mediaId = mediaResult?.id;
                if (mediaId) {
                    coverImageId = mediaId;
                    console.log('✅ Using new Media ID:', coverImageId);
                } else {
                    console.error('❌ Media ID not found in response:', mediaResult);
                    throw new Error('Failed to get Media ID from upload response');
                }
            } catch (error) {
                console.error('❌ Error uploading media:', error);
                throw error; // Throw error để FE biết upload failed
            }
        } else {
            console.log('ℹ️  No new file uploaded, using coverImageId from body:', coverImageId);
        }

        // Remove file-related fields from body before forwarding
        const { file: _, coverImageType: __, ...updateBody } = body;

        // Chỉ truyền coverImageId nếu có giá trị (có thể là string, null để xóa, hoặc undefined để không thay đổi)
        const updatePayload: any = {
            id, 
            updatedBy: currentUser.userId,
            ...updateBody
        };

        // Chỉ thêm coverImageId nếu có giá trị (có thể là string hoặc null để xóa)
        // undefined nghĩa là không thay đổi coverImageId hiện tại
        if (coverImageId !== undefined) {
            updatePayload.coverImageId = coverImageId;
        }

        console.log('📤 Forwarding update payload to TOOL_MARKETING_SERVICE:', JSON.stringify(updatePayload, null, 2));
        return this.apiGateway.forwardToService('TOOL_MARKETING_SERVICE', 'admin.updateToolMarketing', updatePayload);
    }

    @Delete('tool-marketings/:id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Delete tool marketing (soft delete)' })
    @ApiParam({ name: 'id', description: 'Tool Marketing ID' })
    @ApiResponse({ status: 200, description: 'Tool marketing deleted successfully' })
    @ApiResponse({ status: 404, description: 'Tool marketing not found' })
    async deleteToolMarketing(@Param('id') id: string, @CurrentUser() currentUser: JwtPayload): Promise<unknown> {
        return this.apiGateway.forwardToService('TOOL_MARKETING_SERVICE', 'toolMarketing.delete', {
            id,
            deletedBy: currentUser.userId,
        });
    }

    // ===== CONTACT REQUESTS MANAGEMENT =====

    @Get('contact-requests')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get all contact requests with pagination and filters' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'status', required: false, type: String })
    @ApiResponse({ status: 200, description: 'Contact requests retrieved successfully' })
    async getContactRequests(@Query() query: any): Promise<unknown> {
        const payload: any = { ...query };

        if (payload.page !== undefined && payload.page !== null) {
            const p = parseInt(String(payload.page), 10);
            if (!Number.isNaN(p)) {
                payload.pageNo = p;
            }
            delete payload.page;
        }

        if (payload.limit !== undefined && payload.limit !== null) {
            const l = parseInt(String(payload.limit), 10);
            if (!Number.isNaN(l)) {
                payload.pageSize = l;
            }
            delete payload.limit;
        }

        return this.apiGateway.forwardToService('SUPPORT', 'admin.getContactRequests', payload);
    }

    @Patch('contact-requests/:id/status')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Update contact request status' })
    @ApiParam({ name: 'id', type: String, description: 'Contact Request ID' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                status: {
                    type: 'string',
                    enum: ['NEW', 'PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED', 'CONTACTED'],
                    example: 'IN_PROGRESS',
                    description: 'New status of the contact request',
                },
            },
            required: ['status'],
        },
    })
    @ApiResponse({ status: 200, description: 'Contact request status updated successfully' })
    @ApiResponse({ status: 404, description: 'Contact request not found' })
    async updateContactRequestStatus(
        @Param('id') id: string,
        @Body() body: { status: string },
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('SUPPORT', 'admin.updateContactRequestStatus', {
            id,
            status: body.status,
        });
    }

    // ===== NEWSLETTER SUBSCRIPTIONS MANAGEMENT =====

    @Get('newsletter-subscriptions')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get all newsletter subscriptions with pagination and filters' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'source', required: false, type: String })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiResponse({ status: 200, description: 'Newsletter subscriptions retrieved successfully' })
    async getNewsletterSubscriptions(@Query() query: any): Promise<unknown> {
        const payload: any = { ...query };

        if (payload.page !== undefined && payload.page !== null) {
            const p = parseInt(String(payload.page), 10);
            if (!Number.isNaN(p)) {
                payload.pageNo = p;
            }
            delete payload.page;
        }

        if (payload.limit !== undefined && payload.limit !== null) {
            const l = parseInt(String(payload.limit), 10);
            if (!Number.isNaN(l)) {
                payload.pageSize = l;
            }
            delete payload.limit;
        }

        return this.apiGateway.forwardToService('SUPPORT', 'admin.getNewsletterSubscriptions', payload);
    }

    @Delete('newsletter-subscriptions/:id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Delete a newsletter subscription (soft delete)' })
    @ApiParam({ name: 'id', description: 'Newsletter subscription ID' })
    @ApiResponse({ status: 200, description: 'Newsletter subscription deleted successfully' })
    async deleteNewsletterSubscription(@Param('id') id: string): Promise<unknown> {
        return this.apiGateway.forwardToService('SUPPORT', 'admin.deleteNewsletterSubscription', { id });
    }

}
