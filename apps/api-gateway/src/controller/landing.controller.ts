import {
  Controller,
  Get,
  Query,
  Headers,
} from '@nestjs/common';
import { ApiGatewayService } from '../services/api-gateway.service';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Public } from '../decorators';

@ApiTags('Landing')
@Controller('landing')
export class LandingController {
  constructor(
    private readonly apiGateway: ApiGatewayService,
  ) {}

  @Get('blog')
  @Public()
  @ApiOperation({ summary: 'Get blog posts for landing page (defaults to PUBLISHED status and LANDING_PAGE category group)' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by author user ID' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category slug (only shows categories with group LANDING_PAGE or ALL)' })
  @ApiQuery({ name: 'tagName', required: false, description: 'Filter by tag name' })
  @ApiQuery({ name: 'title', required: false, description: 'Filter by title (contains, case-insensitive)' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by post status (defaults to PUBLISHED)', enum: ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'REMOVED'], example: 'PUBLISHED' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale: vi or en', enum: ['vi', 'en'] })
  @ApiQuery({ name: 'skip', required: false, description: 'Number of records to skip', example: 0 })
  @ApiQuery({ name: 'take', required: false, description: 'Number of records to take', example: 10 })
  @ApiResponse({ status: 200, description: 'Blog posts for landing page retrieved' })
  async getLandingBlogPosts(
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
    
    // Default status to PUBLISHED for landing page
    const finalStatus = status || 'PUBLISHED';
    
    // Note: Category filtering by group is handled in the blog service
    // Categories with group LANDING_PAGE or ALL will be shown
    // This is handled in the getCategories service method
    
    return this.apiGateway.forwardToService('BLOG', 'blog.post.filter', {
      userId,
      category,
      tagName,
      title,
      status: finalStatus,
      locale: normalizedLocale,
      skip: Number(skip),
      take: Number(take),
      categoryGroup: 'LANDING_PAGE', // Pass category group filter
    });
  }

  @Get('categories')
  @Public()
  @ApiOperation({ summary: 'Get list of categories for landing page (includes categories with group LANDING_PAGE or ALL)' })
  @ApiResponse({ status: 200, description: 'Categories for landing page retrieved' })
  async getLandingCategories(): Promise<unknown> {
    return this.apiGateway.forwardToService('BLOG', 'blog.categories', { group: 'LANDING_PAGE' });
  }
}

