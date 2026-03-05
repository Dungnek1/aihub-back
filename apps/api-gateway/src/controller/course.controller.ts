import { Controller, Post, Get, Put, Delete, Body, Param, Query, Headers, UseInterceptors, UploadedFile, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiConsumes, ApiHeader, ApiBody, ApiResponse, ApiTags, ApiQuery, ApiParam } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { CurrentUser, Public, Roles } from '../decorators';
import type { JwtPayload } from '@app/shared/interface.ts/user.interface';
import { ApiGatewayService } from '../services/api-gateway.service';
import { Role } from '@app/shared/enum/user.enum';

@ApiTags('Courses')
@Controller('courses')
export class CourseController {
    constructor(
        private readonly apiGateway: ApiGatewayService,
        @Inject('MEDIA_CLIENT') private mediaClient: ClientProxy,
    ) { }

    @Post('admin')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Create a new course' })
    // @ApiConsumes('multipart/form-data')
    @ApiHeader({
        name: 'folder-type',
        description: 'Folder type for organizing uploaded course files (e.g., course, user, default)',
        required: false,
        schema: { type: 'string', default: 'course' }
    })
    @ApiBody({
        description: 'Course data with optional cover image file',
        schema: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                shortDesc: { type: 'string' },
                description: { type: 'string' },
                priceId: { type: 'string', description: 'Price ID for the course' },
                categoryId: { type: 'string', description: 'Category ID for the course' },
                bodyHtml: { type: 'string' },
                seo: { type: 'object', description: 'SEO metadata as JSON' },
                isFeatured: { type: 'boolean', description: 'Khóa học nổi bật (default: true)', default: true },
                link: { type: 'string', description: 'Link tham chiếu đến khóa học' },
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
    @ApiResponse({ status: 201, description: 'Course created' })
    @UseInterceptors(FileInterceptor('file'))
    async createCourse(
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
        @Headers('folder-type') folderType: string = 'course',
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

            // Get Media ID from upload result
            coverImageId = (mediaResult as any)?.filename;
        }

        // Slug will be auto-generated from title in service if not provided

        return this.apiGateway.forwardToService('COURSE', 'course.create', {
            title: body.title,
            shortDesc: body.shortDesc,
            description: body.description,
            // slug will be auto-generated from title in service if not provided
            priceId: body.priceId,
            categoryId: body.categoryId,
            bodyHtml: body.bodyHtml,
            seo: body.seo,
            coverImageId: coverImageId || null,
            isFeatured: body.isFeatured !== undefined ? body.isFeatured : true,
            link: body.link || null,
            createdBy: user.userId,
        });
    }

    @Get('featured')
    @Public()
    @ApiOperation({ summary: 'Get top featured courses' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of featured courses to return', example: 4, type: Number })
    @ApiResponse({ status: 200, description: 'Featured courses retrieved' })
    async getFeaturedCourses(
        @Query('limit') limit?: string,
    ): Promise<unknown> {
        const limitNum = limit ? Math.max(1, parseInt(limit)) : 4;
        return this.apiGateway.forwardToService('COURSE', 'course.getFeatured', {
            limit: limitNum,
        });
    }

    @Get()
    @Public()
    @ApiOperation({ summary: 'Get all courses with pagination' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number (starts from 1)', example: 1, type: Number })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of records per page', example: 10, type: Number })
    @ApiQuery({ name: 'skip', required: false, description: 'Number of records to skip (alternative to page)', example: 0, type: Number })
    @ApiQuery({ name: 'take', required: false, description: 'Number of records to take (alternative to limit)', example: 10, type: Number })
    @ApiQuery({ name: 'status', required: false, description: 'Filter by course status (PUBLIC, PRIVATE, DRAFT)' })
    @ApiQuery({ name: 'isFeatured', required: false, description: 'Filter by featured status (true/false)', type: Boolean })
    @ApiResponse({ status: 200, description: 'Courses retrieved with pagination info' })
    async getCourses(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('skip') skip?: string,
        @Query('take') take?: string,
        @Query('status') status?: string,
        @Query('isFeatured') isFeatured?: string,
    ): Promise<unknown> {
        // Support both page/limit and skip/take for backward compatibility
        let skipNum: number;
        let takeNum: number;

        if (page !== undefined && limit !== undefined) {
            // Use page/limit (page starts from 1)
            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.max(1, parseInt(limit) || 10);
            skipNum = (pageNum - 1) * limitNum;
            takeNum = limitNum;
        } else if (skip !== undefined || take !== undefined) {
            // Use skip/take (backward compatible)
            skipNum = parseInt(skip || '0');
            takeNum = parseInt(take || '10');
        } else {
            // Default: page 1, limit 10
            skipNum = 0;
            takeNum = 10;
        }

        // Only filter by isFeatured if the parameter is explicitly provided (not null/undefined/empty)
        let isFeaturedBool: boolean | undefined = undefined;
        if (isFeatured !== undefined && isFeatured !== null && isFeatured !== '') {
            isFeaturedBool = isFeatured.toLowerCase() === 'true';
        }
        
        return this.apiGateway.forwardToService('COURSE', 'course.getAll', {
            skip: skipNum,
            take: takeNum,
            status,
            isFeatured: isFeaturedBool,
        });
    }

    @Get(':id')
    @Public()
    @ApiOperation({ summary: 'Get a specific course by ID' })
    @ApiParam({ name: 'id', description: 'Course ID' })
    @ApiResponse({ status: 200, description: 'Course retrieved' })
    @ApiResponse({ status: 404, description: 'Course not found' })
    async getCourseById(@Param('id') id: string): Promise<unknown> {
        return this.apiGateway.forwardToService('COURSE', 'course.getById', { id });
    }

    @Get('slug/:slug')
    @Public()
    @ApiOperation({ summary: 'Get a specific course by slug' })
    @ApiParam({ name: 'slug', description: 'Course slug' })
    @ApiResponse({ status: 200, description: 'Course retrieved' })
    @ApiResponse({ status: 404, description: 'Course not found' })
    async getCourseBySlug(@Param('slug') slug: string): Promise<unknown> {
        return this.apiGateway.forwardToService('COURSE', 'course.getBySlug', { slug });
    }

    @Put(':id')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Update a course' })
    @ApiParam({ name: 'id', description: 'Course ID' })
    @ApiBody({
        description: 'Updated course data',
        schema: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                shortDesc: { type: 'string' },
                description: { type: 'string' },
                priceId: { type: 'string' },
                categoryId: { type: 'string' },
                bodyHtml: { type: 'string' },
                status: { type: 'string', enum: ['PUBLIC', 'PRIVATE', 'DRAFT'] },
                seo: { type: 'object' },
                isFeatured: { type: 'boolean', description: 'Khóa học nổi bật' },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'Course updated' })
    async updateCourse(
        @Param('id') id: string,
        @Body() body: any,
        @CurrentUser() user: JwtPayload,
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('COURSE', 'course.update', {
            id,
            ...body,
            updatedBy: user.userId,
        });
    }

    @Delete(':id')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Delete a course (soft delete)' })
    @ApiParam({ name: 'id', description: 'Course ID' })
    @ApiResponse({ status: 200, description: 'Course deleted' })
    async deleteCourse(
        @Param('id') id: string,
        @CurrentUser() user: JwtPayload,
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('COURSE', 'course.delete', {
            id,
            deletedBy: user.userId,
        });
    }

    @Post(':id/publish')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Publish a course' })
    @ApiParam({ name: 'id', description: 'Course ID' })
    @ApiResponse({ status: 200, description: 'Course published' })
    async publishCourse(
        @Param('id') id: string,
        @CurrentUser() user: JwtPayload,
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('COURSE', 'course.publish', {
            id,
            status: 'PUBLIC',
            updatedBy: user.userId,
        });
    }

    @Get('instructor/:instructorId')
    @Public()
    @ApiOperation({ summary: 'Get all courses by instructor' })
    @ApiParam({ name: 'instructorId', description: 'Instructor user ID' })
    @ApiQuery({ name: 'skip', required: false, description: 'Number of records to skip', example: 0 })
    @ApiQuery({ name: 'take', required: false, description: 'Number of records to take', example: 10 })
    @ApiResponse({ status: 200, description: 'Instructor courses retrieved' })
    async getCoursesByInstructor(
        @Param('instructorId') instructorId: string,
        @Query('skip') skip: string = '0',
        @Query('take') take: string = '10',
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('COURSE', 'course.getByInstructor', {
            instructorId,
            skip: parseInt(skip),
            take: parseInt(take),
        });
    }

    @Post(':id/rate')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Rate a course' })
    @ApiParam({ name: 'id', description: 'Course ID' })
    @ApiBody({
        description: 'Rating data',
        schema: {
            type: 'object',
            properties: {
                rating: { type: 'number', minimum: 1, maximum: 5, description: 'Overall rating (1-5 stars)' },
                feedback: { type: 'string', description: 'Feedback text' },
                comment: { type: 'string', description: 'Additional comment' },
                contentQuality: { type: 'number', minimum: 1, maximum: 5, description: 'Content quality rating' },
                instructorQuality: { type: 'number', minimum: 1, maximum: 5, description: 'Instructor quality rating' },
                learningOutcome: { type: 'number', minimum: 1, maximum: 5, description: 'Learning outcome rating' },
                materialsQuality: { type: 'number', minimum: 1, maximum: 5, description: 'Materials quality rating' },
            },
            required: ['rating'],
        },
    })
    @ApiResponse({ status: 201, description: 'Rating created' })
    @ApiResponse({ status: 400, description: 'User already rated this course' })
    async rateCourse(
        @Param('id') courseId: string,
        @Body() body: any,
        @CurrentUser() user: JwtPayload,
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('COURSE', 'course.rate', {
            courseId,
            userId: user.userId,
            ...body,
            createdBy: user.userId,
        });
    }

    @Get(':id/ratings')
    @Public()
    @ApiOperation({ summary: 'Get all ratings for a course' })
    @ApiParam({ name: 'id', description: 'Course ID' })
    @ApiQuery({ name: 'skip', required: false, description: 'Number of records to skip', example: 0 })
    @ApiQuery({ name: 'take', required: false, description: 'Number of records to take', example: 10 })
    @ApiResponse({ status: 200, description: 'Course ratings retrieved' })
    async getCourseRatings(
        @Param('id') courseId: string,
        @Query('skip') skip: string = '0',
        @Query('take') take: string = '10',
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('COURSE', 'course.getRatings', {
            courseId,
            skip: parseInt(skip),
            take: parseInt(take),
        });
    }

    @Post('use')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Mark course as used', operationId: 'markCourseAsUsed' })
    @ApiBody({
        description: 'Course usage data',
        schema: {
            type: 'object',
            properties: {
                courseId: { type: 'string', example: 'course-123', description: 'Course ID' },
            },
            required: ['courseId'],
        },
    })
    @ApiResponse({ status: 200, description: 'Course marked as used successfully' })
    @ApiResponse({ status: 404, description: 'Course not found' })
    async markCourseAsUsed(
        @Body() body: { courseId: string },
        @CurrentUser() user: JwtPayload,
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('COURSE', 'course.use', {
            userId: user.userId,
            courseId: body.courseId,
        });
    }

    @Post('save')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Save or unsave a course', operationId: 'toggleSaveCourse' })
    @ApiBody({
        description: 'Course save data',
        schema: {
            type: 'object',
            properties: {
                courseId: { type: 'string', example: 'course-123', description: 'Course ID' },
            },
            required: ['courseId'],
        },
    })
    @ApiResponse({ status: 200, description: 'Course save status toggled successfully' })
    @ApiResponse({ status: 404, description: 'Course not found' })
    async toggleSaveCourse(
        @Body() body: { courseId: string },
        @CurrentUser() user: JwtPayload,
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('COURSE', 'course.save', {
            userId: user.userId,
            courseId: body.courseId,
        });
    }

    @Get('used')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get user\'s used courses', operationId: 'getUserUsedCourses' })
    @ApiQuery({ name: 'pageNo', required: false, type: Number, description: 'Page number (default: 0)' })
    @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Page size (default: 10)' })
    @ApiResponse({ status: 200, description: 'User used courses retrieved successfully' })
    async getUserUsedCourses(
        @Query('pageNo') pageNo: number = 0,
        @Query('pageSize') pageSize: number = 10,
        @CurrentUser() user: JwtPayload,
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('COURSE', 'course.get-used', {
            userId: user.userId,
            pageNo: Number(pageNo),
            pageSize: Number(pageSize),
        });
    }

    @Get('saved')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get user\'s saved courses', operationId: 'getUserSavedCourses' })
    @ApiQuery({ name: 'pageNo', required: false, type: Number, description: 'Page number (default: 0)' })
    @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Page size (default: 10)' })
    @ApiResponse({ status: 200, description: 'User saved courses retrieved successfully' })
    async getUserSavedCourses(
        @Query('pageNo') pageNo: number = 0,
        @Query('pageSize') pageSize: number = 10,
        @CurrentUser() user: JwtPayload,
    ): Promise<unknown> {
        return this.apiGateway.forwardToService('COURSE', 'course.get-saved', {
            userId: user.userId,
            pageNo: Number(pageNo),
            pageSize: Number(pageSize),
        });
    }

    @Post(':id/view')
    @Public()
    @ApiOperation({ summary: 'Increment view count for a course' })
    @ApiParam({ name: 'id', description: 'Course ID' })
    @ApiResponse({ status: 200, description: 'Course view count updated' })
    async incrementCourseView(@Param('id') id: string): Promise<unknown> {
        return this.apiGateway.forwardToService('COURSE', 'course.incrementView', { id });
    }
}
