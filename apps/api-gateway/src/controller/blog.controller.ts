import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Version,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
  ParseFilePipeBuilder,
  Inject,
  Headers,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClientProxy } from '@nestjs/microservices';
import { ApiGatewayService } from '../services/api-gateway.service';
import { RedisService } from '@app/redis';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiQuery, ApiParam, ApiConsumes, ApiHeader } from '@nestjs/swagger';
import { Public, CurrentUser } from '../decorators';
import type { JwtPayload } from '@app/shared/interface.ts/user.interface';
import { firstValueFrom } from 'rxjs';

@ApiTags('Blog')
@Controller('blog')
export class BlogController {
  constructor(
    private readonly apiGateway: ApiGatewayService,
    @Inject('MEDIA_CLIENT') private readonly mediaClient: ClientProxy,
    private readonly redisService: RedisService,
  ) { }

  /**
   * Clear post cache by slug for all locales
   */
  private async clearPostCache(slug: string): Promise<void> {
    const locales = ['vi', 'en'];
    const cacheKeys: string[] = [];

    // Xóa cache cho tất cả locales
    for (const locale of locales) {
      cacheKeys.push(`blog:post:slug:${slug}:locale:${locale}`);
    }

    // Xóa cache không có locale (backward compatibility)
    cacheKeys.push(`blog:post:slug:${slug}`);

    try {
      // Xóa tất cả cache keys
      for (const key of cacheKeys) {
        await this.redisService.del(key);
      }
      console.log(`✅ Cleared cache for post slug: ${slug} (${cacheKeys.length} keys)`);
    } catch (error) {
      console.error(`❌ Failed to clear cache for post slug: ${slug}`, error);
    }
  }

  @Post('posts')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new blog post' })
  @ApiConsumes('multipart/form-data')
  @ApiHeader({
    name: 'folder-type',
    description: 'Folder type for organizing uploaded audio files (e.g., blog, user, default)',
    required: false,
    schema: { type: 'string', default: 'blog' }
  })
  @ApiBody({
    description: 'Post data with optional cover image file',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        bodyHtml: { type: 'string' },
        categoryId: { type: 'string' },
        tagIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of tag IDs to assign to the post'
        },
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
      required: ['title'],
    },
  })
  @ApiResponse({ status: 201, description: 'Post created' })
  @UseInterceptors(FileInterceptor('file'))
  async createPost(
    @Body() body: any,
    @Headers('folder-type') folderType: string = 'blog',
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<unknown> {
    let mediaId: string | undefined;

    // Parse SEO data from nested form fields (seo[metaTitle], seo[metaDescription], etc.)
    let seoData: any = undefined;
    if (body.seo) {
      // If seo is already an object (from JSON parsing)
      seoData = typeof body.seo === 'string' ? JSON.parse(body.seo) : body.seo;
    } else {
      // Parse from flat form fields: seo[metaTitle], seo[metaDescription], etc.
      const seoFields: any = {};
      Object.keys(body).forEach(key => {
        if (key.startsWith('seo[') && key.endsWith(']')) {
          const fieldName = key.slice(4, -1); // Remove 'seo[' and ']'
          seoFields[fieldName] = body[key];
          delete body[key];
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

      // Parse schema if provided
      if (seoFields['schema[article]']) {
        seoFields.schema = seoFields.schema || {};
        seoFields.schema.article = typeof seoFields['schema[article]'] === 'string'
          ? JSON.parse(seoFields['schema[article]'])
          : seoFields['schema[article]'];
        delete seoFields['schema[article]'];
      }
      if (seoFields['schema[faqPage]']) {
        seoFields.schema = seoFields.schema || {};
        seoFields.schema.faqPage = typeof seoFields['schema[faqPage]'] === 'string'
          ? JSON.parse(seoFields['schema[faqPage]'])
          : seoFields['schema[faqPage]'];
        delete seoFields['schema[faqPage]'];
      }
      if (seoFields['schema[definedTerm]']) {
        seoFields.schema = seoFields.schema || {};
        seoFields.schema.definedTerm = typeof seoFields['schema[definedTerm]'] === 'string'
          ? JSON.parse(seoFields['schema[definedTerm]'])
          : seoFields['schema[definedTerm]'];
        delete seoFields['schema[definedTerm]'];
      }

      if (Object.keys(seoFields).length > 0) {
        seoData = seoFields;
      }
    }

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
      mediaId = (mediaResult as any)?.id;
    }

    // Use provided slug or generate from title
    let slug: string;
    if (body.slug && body.slug.trim()) {
      // Use provided slug, but sanitize it
      slug = body.slug
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9-]/g, '') // Only allow lowercase, numbers, and hyphens (no dots)
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    } else {
      // Generate slug from title
      const baseSlug = body.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      slug = baseSlug;
    }

    // Check if slug already exists
    const existingPost = await this.apiGateway.forwardToService('BLOG', 'blog.post.getBySlug', { slug });
    if (existingPost) {
      // Count total posts to append to slug
      const totalPosts = await this.apiGateway.forwardToService('BLOG', 'blog.post.count', {});
      slug = `${slug}-${totalPosts}`;
    }

    // Parse tagIds
    let tagIds: string[] = [];
    if (body.tagIds) {
      if (Array.isArray(body.tagIds)) {
        tagIds = body.tagIds;
      } else if (typeof body.tagIds === 'string') {
        try {
          tagIds = JSON.parse(body.tagIds);
        } catch {
          tagIds = [body.tagIds];
        }
      }
    }

    const result = await this.apiGateway.forwardToService('BLOG', 'blog.post.create', {
      title: body.title,
      slug,
      bodyHtml: body.bodyHtml,
      categoryId: body.categoryId,
      tagIds,
      authorId: user.userId,
      coverImageId: mediaId || "",
      role: user.role,
      locale: body.locale || 'vi',
      seo: seoData,
      excerpt: body.excerpt,
      authorName: body.authorName,
      publishedAt: body.publishedAt,
    });

    // Clear cache for blog listing pages when new post is created
    // This ensures the new post appears in the list immediately
    if (result && slug) {
      try {
        // Clear cache for the new post (in case it's accessed immediately)
        await this.clearPostCache(slug);
        console.log(`✅ Cache cleared for newly created post slug: ${slug}`);
      } catch (error) {
        console.error('❌ Failed to clear cache after post creation:', error);
      }
    }

    return result;
  }

  @Get('posts')
  @Public()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List all blog posts' })
  @ApiResponse({ status: 200, description: 'Posts retrieved' })
  async listPosts(
    @Query('skip') skip: number = 0,
    @Query('take') take: number = 10,
  ) {
    return this.apiGateway.forwardToService('BLOG', 'blog.post.list', {
      skip: Number(skip),
      take: Number(take),
    });
  }

  @Get('posts/:slug')
  @Public()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get a specific blog post by slug' })
  @ApiResponse({ status: 200, description: 'Post retrieved' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async getPost(
    @Param('slug') slug: string,
    @Query('locale') locale?: string,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<unknown> {
    // Get locale from query param, header, or default to 'vi'
    const requestedLocale = locale || (acceptLanguage?.split(',')[0]?.split('-')[0]?.toLowerCase()) || 'vi';
    const normalizedLocale = ['vi', 'en'].includes(requestedLocale) ? requestedLocale : 'vi';

    const cacheKey = `blog:post:slug:${slug}:locale:${normalizedLocale}`;

    // const cachedPost = await this.redisService.getJson(cacheKey);
    // if (cachedPost) {
    //   return cachedPost;
    // }

    const post = await this.apiGateway.forwardToService('BLOG', 'blog.post.getBySlug', {
      slug,
      locale: normalizedLocale,
    });

    // if (post) {
    //   // Cache for 1 minute (60 seconds) as requested
    //   await this.redisService.set(cacheKey, JSON.stringify(post), 60);
    // }

    return post;
  }

  @Post('posts/:postId/view')
  @Public()
  @ApiOperation({ summary: 'Increment view count for a blog post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'View count incremented successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        viewsCount: { type: 'number', example: 101 }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async incrementPostView(@Param('postId') postId: string): Promise<unknown> {
    return this.apiGateway.forwardToService('BLOG', 'blog.post.incrementView', {
      postId,
    });
  }

  @Get('posts/:id/related')
  @Public()
  @ApiOperation({ summary: 'Get related posts by post ID' })
  @ApiResponse({ status: 200, description: 'Related posts retrieved' })
  async getRelatedPosts(
    @Param('id') postId: string,
    @Query('take') take: number = 3,
  ): Promise<unknown> {
    return this.apiGateway.forwardToService('BLOG', 'blog.post.getRelated', {
      postId,
      take: Math.min(Number(take), 3), // Max 3 posts
    });
  }

  @Put('posts/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a blog post' })
  @ApiHeader({
    name: 'folder-type',
    description: 'Folder type for organizing uploaded files (e.g., blog, user, default)',
    required: false,
    schema: { type: 'string', default: 'blog' }
  })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    description: 'Updated post data (can include file for cover image)',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        slug: { type: 'string' },
        bodyHtml: { type: 'string' },
        categoryId: { type: 'string' },
        seo: { type: 'object' },
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
  @ApiResponse({ status: 200, description: 'Post updated' })
  @UseInterceptors(FileInterceptor('file'))
  async updatePost(
    @Param('id') id: string,
    @Req() req: Request,
    @Headers('folder-type') folderType: string = 'blog',
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<unknown> {
    // Get body from request (multipart/form-data is parsed by FileInterceptor)
    // FileInterceptor parses multipart/form-data and puts text fields in req.body
    const requestBody = (req.body || {}) as any;

    console.log('📥 Update Post Request:', {
      id,
      hasFile: !!file,
      coverImageType: requestBody.coverImageType,
      bodyKeys: Object.keys(requestBody || {}),
      bodyType: typeof requestBody,
    });

    let mediaId: string | undefined;

    // Upload cover image if provided
    if (file && requestBody.coverImageType) {
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
          this.mediaClient.send(`media.upload.${requestBody.coverImageType}`, {
            filename: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            type: requestBody.coverImageType,
            userId: user.userId,
            folderType: folderType,
          }),
        );
        console.log('✅ Media upload result:', JSON.stringify(mediaResult, null, 2));

        // Get media ID from upload response
        mediaId = mediaResult?.id;
        if (mediaId) {
          console.log('✅ Using new Media ID:', mediaId);
        } else {
          console.error('❌ Media ID not found in response:', mediaResult);
          throw new Error('Failed to get Media ID from upload response');
        }
      } catch (error) {
        console.error('❌ Error uploading media:', error);
        throw error;
      }
    }

    // Remove file-related fields from body before forwarding
    const updateBody: any = { ...requestBody };
    delete updateBody.file;
    delete updateBody.coverImageType;

    // Parse SEO data similar to createPost
    let seoData: any = undefined;
    if (updateBody.seo) {
      seoData = typeof updateBody.seo === 'string' ? JSON.parse(updateBody.seo) : updateBody.seo;
    } else {
      const seoFields: any = {};
      Object.keys(updateBody || {}).forEach(key => {
        if (key.startsWith('seo[') && key.endsWith(']')) {
          const fieldName = key.slice(4, -1);
          seoFields[fieldName] = updateBody[key];
          delete updateBody[key];
        }
      });

      if (seoFields.secondaryKeywords && typeof seoFields.secondaryKeywords === 'string') {
        try {
          seoFields.secondaryKeywords = JSON.parse(seoFields.secondaryKeywords);
        } catch {
          seoFields.secondaryKeywords = seoFields.secondaryKeywords.split(',').map((k: string) => k.trim()).filter((k: string) => k);
        }
      }

      if (Object.keys(seoFields).length > 0) {
        seoData = seoFields;
      }
    }

    const updateData: any = {
      ...updateBody,
    };

    // Add mediaId if file was uploaded
    if (mediaId) {
      updateData.coverImageId = mediaId;
    }

    if (seoData) {
      updateData.seo = seoData;
    }

    const result = await this.apiGateway.forwardToService('BLOG', 'blog.post.update', {
      id,
      ...updateData,
    });

    // Clear cache for all locales when update is successful
    if (result) {
      try {
        // Get updated post data to get slug
        const updatedPost = await this.apiGateway.forwardToService('BLOG', 'blog.post.getById', { id });
        if (updatedPost && (updatedPost as any).slug) {
          const slug = (updatedPost as any).slug;
          // Xóa cache cũ cho tất cả locales
          await this.clearPostCache(slug);
          console.log(`✅ Cache cleared for updated post slug: ${slug}`);
        }
      } catch (error) {
        console.error('❌ Failed to clear cache after post update:', error);
      }
    }

    return result;
  }

  @Delete('posts/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a blog post (soft delete)' })
  @ApiResponse({ status: 200, description: 'Post deleted (soft delete)' })
  async deletePost(@Param('id') id: string, @CurrentUser() user?: JwtPayload): Promise<unknown> {
    // Get post slug before deleting for cache clearing
    let slug: string | null = null;
    try {
      const post = await this.apiGateway.forwardToService('BLOG', 'blog.post.getById', { id });
      slug = post ? (post as any).slug : null;
    } catch (error) {
      console.error('Failed to get post slug before deletion:', error);
    }

    const result = await this.apiGateway.forwardToService('BLOG', 'blog.post.delete', {
      id,
      deletedBy: user?.userId
    });

    // Clear cache after successful deletion
    if (result && slug) {
      await this.clearPostCache(slug);
    }

    return result;
  }

  @Post('posts/:id/publish')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Publish a blog post' })
  @ApiResponse({ status: 200, description: 'Post published' })
  async publishPost(@Param('id') id: string): Promise<unknown> {
    const result = await this.apiGateway.forwardToService('BLOG', 'blog.post.publish', {
      id,
    });

    // Clear cache if publish was successful
    if (result) {
      try {
        const post = await this.apiGateway.forwardToService('BLOG', 'blog.post.getById', { id });
        if (post && (post as any).slug) {
          await this.clearPostCache((post as any).slug);
        }
      } catch (error) {
        console.error('Failed to get post for cache clearing:', error);
      }
    }

    return result;
  }

  @Get('posts/author/:authorId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get posts by author' })
  @ApiResponse({ status: 200, description: 'Author posts retrieved' })
  async getAuthorPosts(
    @Param('authorId') authorId: string,
    @Query('skip') skip: number = 0,
    @Query('take') take: number = 10,
  ) {
    return this.apiGateway.forwardToService('BLOG', 'blog.post.getByAuthor', {
      authorId,
      skip: Number(skip),
      take: Number(take),
    });
  }

  @Get('filter')
  @Public()
  @ApiOperation({ summary: 'Filter posts by user/category/tag/title (OR across provided filters)' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by author user ID' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category slug' })
  @ApiQuery({ name: 'tagName', required: false, description: 'Filter by tag name' })
  @ApiQuery({ name: 'title', required: false, description: 'Filter by title (contains, case-insensitive)' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by post status', enum: ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'REMOVED'] })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale: vi or en', enum: ['vi', 'en'] })
  @ApiQuery({ name: 'skip', required: false, description: 'Number of records to skip', example: 0 })
  @ApiQuery({ name: 'take', required: false, description: 'Number of records to take', example: 10 })
  @ApiResponse({ status: 200, description: 'Filtered posts retrieved' })
  async filterPosts(
    @Query('userId') userId?: string,
    @Query('category') category?: string,
    @Query('tagName') tagName?: string,
    @Query('title') title?: string,
    @Query('locale') locale?: string,
    @Headers('accept-language') acceptLanguage?: string,
    @Query('status') status?: string,
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '10',
  ) {
    // Get locale from query param, header, or default to 'vi'
    const requestedLocale = locale || (acceptLanguage?.split(',')[0]?.split('-')[0]?.toLowerCase()) || 'vi';
    const normalizedLocale = ['vi', 'en'].includes(requestedLocale) ? requestedLocale : 'vi';

    // Default categoryGroup to ALL if not provided (show all categories)
    const categoryGroup = 'ALL';

    return this.apiGateway.forwardToService('BLOG', 'blog.post.filter', {
      userId,
      category,
      tagName,
      title,
      status,
      locale: normalizedLocale,
      categoryGroup,
      skip: Number(skip),
      take: Number(take),
    });
  }


  @Post('share/:postId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Share a blog post' })
  @ApiBody({
    description: 'User ID who is sharing',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
      },
      required: ['userId'],
    },
  })
  @ApiResponse({ status: 200, description: 'Post shared successfully' })
  async sharePost(
    @Param('postId') postId: string,
    @Body() body: { userId: string },
  ): Promise<unknown> {
    return this.apiGateway.forwardToService('BLOG', 'blog.post.share', {
      postId,
      userId: body.userId,
    });
  }

  @Post('posts/:postId/view')
  @Public()
  @ApiOperation({ summary: 'Increment view count for a blog post' })
  @ApiParam({ name: 'postId', description: 'Post ID', example: 'clxxx123' })
  @ApiResponse({ status: 200, description: 'Post view count updated successfully', schema: { type: 'object', properties: { postId: { type: 'string' }, contentId: { type: 'string' }, viewsCount: { type: 'number' } } } })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async updatePostView(@Param('postId') postId: string): Promise<unknown> {
    return this.apiGateway.forwardToService('BLOG', 'blog.post.updateView', {
      postId,
    });
  }

  @Post('comment/create')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a comment on a post' })
  @ApiBody({
    description: 'Comment data',
    schema: {
      type: 'object',
      properties: {
        refId: { type: 'string', description: 'Post ID' },
        bodyHtml: { type: 'string', description: 'Comment HTML content' },
        parentCommentId: { type: 'string', description: 'Parent comment ID for nested replies (optional)' },
        userId: { type: 'string', description: 'User ID (from JWT)' },
      },
      required: ['refId', 'bodyHtml', 'userId'],
    },
  })
  @ApiResponse({ status: 201, description: 'Comment created' })
  async createComment(@Body() body: unknown): Promise<unknown> {
    return this.apiGateway.forwardToService('BLOG', 'blog.comment.create', body);
  }

  @Get('comment/list')
  @Public()
  @ApiOperation({ summary: 'Get comments list with pagination and sorting' })
  @ApiQuery({ name: 'pageNo', required: false, description: 'Page number (0-indexed)', example: 0 })
  @ApiQuery({ name: 'pageSize', required: false, description: 'Number of records per page', example: 5 })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (PUBLISHED, DRAFT, etc.)', example: 'PUBLISHED' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field (createdAt)', example: 'createdAt' })
  @ApiQuery({ name: 'sortType', required: false, description: 'Sort order (asc/desc)', example: 'desc' })
  @ApiQuery({ name: 'refId', required: false, description: 'Filter by post ID (optional)' })
  @ApiResponse({ status: 200, description: 'Comments retrieved' })
  async getCommentsList(
    @Query('pageNo') pageNo: string = '0',
    @Query('pageSize') pageSize: string = '5',
    @Query('status') status: string = 'PUBLISHED',
    @Query('sortBy') sortBy: string = 'createdAt',
    @Query('sortType') sortType: 'asc' | 'desc' = 'desc',
    @Query('refId') refId?: string,
  ): Promise<unknown> {
    return this.apiGateway.forwardToService('BLOG', 'blog.comment.list', {
      pageNo: Number(pageNo),
      pageSize: Number(pageSize),
      status,
      sortBy,
      sortType,
      refId,
    });
  }

  @Get('user/filter')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get my blog posts with filters (DRAFT, PENDING_REVIEW, PUBLISHED, REJECTED, REMOVED, or all)' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status',
    enum: ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'REMOVED', 'all'],
    example: 'PUBLISHED'
  })
  @ApiQuery({ name: 'pageNo', required: false, description: 'Page number (0-indexed)', example: 0 })
  @ApiQuery({ name: 'pageSize', required: false, description: 'Number of records per page', example: 10 })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Sort field',
    enum: ['createdAt', 'updatedAt', 'title'],
    example: 'createdAt'
  })
  @ApiQuery({
    name: 'sortType',
    required: false,
    description: 'Sort order',
    enum: ['asc', 'desc'],
    example: 'desc'
  })
  @ApiResponse({ status: 200, description: 'User posts retrieved' })
  async getUserPosts(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('pageNo') pageNo: string = '0',
    @Query('pageSize') pageSize: string = '10',
    @Query('sortBy') sortBy: string = 'createdAt',
    @Query('sortType') sortType: 'asc' | 'desc' = 'desc',
  ): Promise<unknown> {
    return this.apiGateway.forwardToService('BLOG', 'blog.user.posts', {
      userId: user.userId,
      status,
      pageNo: Number(pageNo),
      pageSize: Number(pageSize),
      sortBy,
      sortType,
    });
  }

  @Get('activity')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user activity history (reactions, comments, shares on posts)' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by activity type', enum: ['reacted', 'commented', 'shared', 'all'], example: 'all' })
  @ApiQuery({ name: 'pageNo', required: false, description: 'Page number (0-indexed)', example: 0 })
  @ApiQuery({ name: 'pageSize', required: false, description: 'Number of records per page', example: 10 })
  @ApiResponse({ status: 200, description: 'User activity retrieved' })
  async getUserActivity(
    @CurrentUser() user: any,
    @Query('type') type: 'reacted' | 'commented' | 'shared' | 'all' = 'all',
    @Query('pageNo') pageNo: string = '0',
    @Query('pageSize') pageSize: string = '10',
  ): Promise<unknown> {
    return this.apiGateway.forwardToService('BLOG', 'blog.user.activity', {
      userId: user.userId,
      type,
      pageNo: Number(pageNo),
      pageSize: Number(pageSize),
    });
  }

  @Post('react/:postId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a reaction to a post' })
  @ApiParam({ name: 'postId', description: 'Post ID to react to', example: 'clxxx123' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reactionType: {
          type: 'string',
          enum: ['LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY', 'THUONGTHUONG'],
          default: 'LIKE',
          description: 'Type of reaction'
        }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Reaction created successfully' })
  @ApiResponse({ status: 400, description: 'User already reacted to this post' })
  @ApiResponse({ status: 404, description: 'Post not found or not published' })
  async createReaction(
    @CurrentUser() user: any,
    @Param('postId') postId: string,
    @Body('reactionType') reactionType?: string,
  ): Promise<unknown> {
    return this.apiGateway.forwardToService('BLOG', 'blog.reaction.create', {
      postId,
      userId: user.userId,
      reactionType,
    });
  }

  @Put('react/:postId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update reaction type on a post' })
  @ApiParam({ name: 'postId', description: 'Post ID', example: 'clxxx123' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['reactionType'],
      properties: {
        reactionType: {
          type: 'string',
          enum: ['LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY', 'THUONGTHUONG'],
          description: 'New reaction type'
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Reaction updated successfully' })
  @ApiResponse({ status: 404, description: 'Reaction not found' })
  async updateReaction(
    @CurrentUser() user: any,
    @Param('postId') postId: string,
    @Body('reactionType') reactionType: string,
  ): Promise<unknown> {
    return this.apiGateway.forwardToService('BLOG', 'blog.reaction.update', {
      postId,
      userId: user.userId,
      reactionType,
    });
  }

  @Delete('react/:postId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete reaction from a post' })
  @ApiParam({ name: 'postId', description: 'Post ID', example: 'clxxx123' })
  @ApiResponse({ status: 200, description: 'Reaction deleted successfully' })
  @ApiResponse({ status: 404, description: 'Reaction not found' })
  async deleteReaction(
    @CurrentUser() user: any,
    @Param('postId') postId: string,
  ): Promise<unknown> {
    return this.apiGateway.forwardToService('BLOG', 'blog.reaction.delete', {
      postId,
      userId: user.userId,
    });
  }

  // ===== Homepage Features (migrated from homepage-service) =====

  @Get('categories')
  @Public()
  @ApiOperation({ summary: 'Get list of categories' })
  @ApiResponse({ status: 200, description: 'Categories retrieved' })
  async getCategories(): Promise<unknown> {
    return this.apiGateway.forwardToService('BLOG', 'blog.categories', {});
  }

  @Post('categories')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new category' })
  @ApiBody({
    description: 'Category data',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        slug: { type: 'string' },
        description: { type: 'string' },
        group: { type: 'string', enum: ['ALL', 'BLOG', 'TOOL', 'TOOL_MARKETING', 'COURSE', 'LANDING_PAGE'], default: 'ALL' },
      },
      required: ['name', 'slug'],
    },
  })
  @ApiResponse({ status: 201, description: 'Category created' })
  async createCategory(@Body() body: unknown): Promise<unknown> {
    return this.apiGateway.forwardToService('BLOG', 'blog.category.create', body);
  }

  @Get('categories/:id')
  @Public()
  @ApiOperation({ summary: 'Get a category by ID' })
  @ApiResponse({ status: 200, description: 'Category retrieved' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async getCategory(@Param('id') id: string): Promise<unknown> {
    return this.apiGateway.forwardToService('BLOG', 'blog.category.getById', { id });
  }

  @Put('categories/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a category' })
  @ApiBody({
    description: 'Updated category data',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        slug: { type: 'string' },
        description: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Category updated' })
  async updateCategory(
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<unknown> {
    return this.apiGateway.forwardToService('BLOG', 'blog.category.update', {
      id,
      ...(body as Record<string, unknown>),
    });
  }

  @Delete('categories/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a category' })
  @ApiResponse({ status: 200, description: 'Category deleted' })
  async deleteCategory(@Param('id') id: string): Promise<unknown> {
    return this.apiGateway.forwardToService('BLOG', 'blog.category.delete', { id });
  }

  @Put('posts/:id/category')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Assign or update category for a post' })
  @ApiBody({
    description: 'Category assignment',
    schema: {
      type: 'object',
      properties: {
        categoryId: { type: 'string' },
      },
      required: ['categoryId'],
    },
  })
  @ApiResponse({ status: 200, description: 'Post category updated' })
  async assignCategoryToPost(
    @Param('id') id: string,
    @Body('categoryId') categoryId: string,
  ): Promise<unknown> {
    const result = await this.apiGateway.forwardToService('BLOG', 'blog.post.assignCategory', {
      id,
      categoryId,
    });

    // Clear cache if assignment was successful
    if (result) {
      try {
        const post = await this.apiGateway.forwardToService('BLOG', 'blog.post.getById', { id });
        if (post && (post as any).slug) {
          await this.clearPostCache((post as any).slug);
        }
      } catch (error) {
        console.error('Failed to get post for cache clearing:', error);
      }
    }

    return result;
  }

  @Get('admin/posts')
  @Public()
  @ApiOperation({ summary: 'Get latest 4 posts from admin users' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of posts to retrieve', example: 4 })
  @ApiResponse({ status: 200, description: 'Admin posts retrieved' })
  async getAdminPosts(@Query('limit') limit: string = '4'): Promise<unknown> {
    return this.apiGateway.forwardToService('BLOG', 'blog.admin.posts', {
      limit: Number(limit),
    });
  }

  @Get('tools/top-rated')
  @Public()
  @ApiOperation({ summary: 'Get top-rated tools' })
  @ApiResponse({ status: 200, description: 'Top-rated tools retrieved' })
  async getTopRatedTools(
    @Query('limit') limit: string = '4',
    @Query('sortBy') sortBy: string = 'rating:desc',
  ): Promise<unknown> {
    return this.apiGateway.forwardToService('BLOG', 'blog.tools.top_rated', {
      limit: Number(limit),
      sortBy,
    });
  }

  @Get('user/new')
  @Public()
  @ApiOperation({ summary: 'Get new user posts' })
  @ApiResponse({ status: 200, description: 'New posts retrieved' })
  async getNewUserPosts(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('category') category?: string,
    @Query('sortBy') sortBy: string = 'createdAt:desc',
  ): Promise<unknown> {
    return this.apiGateway.forwardToService('BLOG', 'blog.user.new', {
      page: Number(page),
      limit: Number(limit),
      category,
      sortBy,
    });
  }

  @Get('featured')
  @Public()
  @ApiOperation({ summary: 'Get featured posts' })
  @ApiResponse({ status: 200, description: 'Featured posts retrieved' })
  async getFeaturedPosts(@Query('limit') limit: string = '5'): Promise<unknown> {
    return this.apiGateway.forwardToService('BLOG', 'blog.featured', {
      limit: Number(limit),
    });
  }

  @Get('posts/:contentId/my-reaction')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Check if user has reacted to a post' })
  @ApiParam({ name: 'contentId', description: 'Content ID of the post' })
  @ApiResponse({
    status: 200,
    description: 'User reaction info',
    schema: {
      type: 'object',
      properties: {
        hasReacted: { type: 'boolean' },
        reactionType: { type: 'string', nullable: true, example: 'LIKE' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async getUserReaction(
    @Param('contentId') contentId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<unknown> {
    return this.apiGateway.forwardToService('BLOG', 'blog.reaction.check', {
      contentId,
      userId: user.userId,
    });
  }


}
