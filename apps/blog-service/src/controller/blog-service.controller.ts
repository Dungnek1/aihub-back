import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  Query,
} from '@nestjs/common';
import {
  MessagePattern,
  Payload,
  Ctx,
  RmqContext,
} from '@nestjs/microservices';
import { BlogServiceService } from '../services/blog-service.service';
import { AnalyticsService } from '../services/analytics.service';

// Helper type guard for Rmq message ack/nack
function isAckNackable(msg: unknown): msg is {
  ack: (m?: unknown) => void;
  nack: (m?: unknown, allUpTo?: boolean, requeue?: boolean) => void;
} {
  return (
    typeof msg === 'object' && msg !== null && 'ack' in msg && 'nack' in msg
  );
}

@Controller('blog')
export class BlogServiceController {
  constructor(
    private readonly blogServiceService: BlogServiceService,
    private readonly analyticsService: AnalyticsService,
  ) { }

  // ===== REST API Endpoints (called by API Gateway) =====

  @Post('create')
  async createPost(
    @Body()
    body: {
      title: string;
      slug: string;
      bodyHtml?: string;
      categoryId?: string;
      authorId: string;
      coverImageId?: string;
    },
  ) {
    return this.blogServiceService.createPost(body);
  }

  @Get('list')
  async listPosts(@Query('skip') skip = 0, @Query('take') take = 10) {
    return this.blogServiceService.getPosts(Number(skip), Number(take));
  }

  @Get(':id')
  async getPost(@Param('id') id: string) {
    return this.blogServiceService.getPostById(id);
  }

  @Put(':id')
  async updatePost(
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      slug?: string;
      bodyHtml?: string;
      categoryId?: string;
    },
  ) {
    return this.blogServiceService.updatePost(id, body);
  }

  @Delete(':id')
  async deletePost(@Param('id') id: string) {
    return this.blogServiceService.deletePost(id);
  }

  @Post(':id/publish')
  async publishPost(@Param('id') id: string) {
    return this.blogServiceService.publishPost(id);
  }

  @Get('author/:authorId')
  async getAuthorPosts(
    @Param('authorId') authorId: string,
    @Query('skip') skip = 0,
    @Query('take') take = 10,
  ) {
    return this.blogServiceService.getPostsByAuthor(
      authorId,
      Number(skip),
      Number(take),
    );
  }

  // New: filter endpoint (matches ANY of provided filters)
  @Get('filter')
  async filterPosts(
    @Query('userId') userId?: string,
    @Query('category') category?: string,
    @Query('tagName') tagName?: string,
    @Query('title') title?: string,
    @Query('status') status?: string,
    @Query('locale') locale?: string,
    @Query('skip') skip = 0,
    @Query('take') take = 10,
  ) {
    return this.blogServiceService.getPostsByFilter(
      { userId, category, tagName, title, status, locale },
      Number(skip),
      Number(take),
    );
  }

  @Post('share/:postId')
  async sharePost(
    @Param('postId') postId: string,
    @Body() body: { userId: string },
  ) {
    return this.blogServiceService.sharePost(postId, body.userId);
  }

  @Post('comment/create')
  async createComment(
    @Body()
    body: {
      refId: string;
      userId: string;
      bodyHtml?: string;
      parentCommentId?: string;
    },
  ) {
    return this.blogServiceService.createComment(body);
  }

  @Get('comment/list')
  async getCommentsList(
    @Query('pageNo') pageNo = 0,
    @Query('pageSize') pageSize = 5,
    @Query('status') status = 'PUBLISHED',
    @Query('sortBy') sortBy = 'createdAt',
    @Query('sortType') sortType: 'asc' | 'desc' = 'desc',
    @Query('refId') refId?: string,
  ) {
    return this.blogServiceService.getCommentsList(
      Number(pageNo),
      Number(pageSize),
      status,
      sortBy,
      sortType,
      refId,
    );
  }

  @Get('activity')
  async getUserActivity(
    @Query('userId') userId: string,
    @Query('type') type: 'reacted' | 'commented' | 'shared' | 'all' = 'all',
    @Query('pageNo') pageNo = 0,
    @Query('pageSize') pageSize = 10,
  ) {
    return this.blogServiceService.getUserActivity(
      userId,
      type,
      Number(pageNo),
      Number(pageSize),
    );
  }

  @Get('user/filter')
  async getUserPosts(
    @Query('userId') userId: string,
    @Query('pageNo') pageNo = 0,
    @Query('pageSize') pageSize = 10,
    @Query('status') status?: string,
    @Query('sortBy') sortBy = 'createdAt',
    @Query('sortType') sortType: 'asc' | 'desc' = 'desc',
  ) {
    return this.blogServiceService.getUserPosts(
      userId,
      Number(pageNo),
      Number(pageSize),
      status,
      sortBy,
      sortType,
    );
  }

  @Post('react/:postId')
  async createReaction(
    @Param('postId') postId: string,
    @Body() body: { userId: string; reactionType?: string },
  ) {
    return this.blogServiceService.createReaction(
      postId,
      body.userId,
      body.reactionType,
    );
  }

  @Put('react/:postId')
  async updateReaction(
    @Param('postId') postId: string,
    @Body() body: { userId: string; reactionType: string },
  ) {
    return this.blogServiceService.updateReaction(
      postId,
      body.userId,
      body.reactionType,
    );
  }

  @Delete('react/:postId')
  async deleteReaction(
    @Param('postId') postId: string,
    @Body() body: { userId: string },
  ) {
    return this.blogServiceService.deleteReaction(postId, body.userId);
  }

  // ===== Homepage Features (migrated) =====

  @Get('categories')
  async getCategories() {
    return this.blogServiceService.getCategories();
  }

  @Get('tools/top-rated')
  async getTopRatedTools(
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    return this.blogServiceService.getTopRatedTools(
      limit ? Number(limit) : 4,
      sortBy || 'rating:desc',
    );
  }

  @Get('user/new')
  async getNewUserPosts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    return this.blogServiceService.getNewUserPosts(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      category,
      sortBy || 'createdAt:desc',
    );
  }

  @Get('featured')
  async getFeaturedPosts(@Query('limit') limit?: string) {
    return this.blogServiceService.getFeaturedPosts(limit ? Number(limit) : 5);
  }

  // ===== RabbitMQ Message Patterns =====

  @MessagePattern('blog.post.create')
  async handleCreatePost(
    @Payload()
    body: {
      title: string;
      slug: string;
      bodyHtml?: string;
      categoryId?: string;
      authorId: string;
      coverImageId?: string;
      role?: string;
      locale?: string;
    },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.blogServiceService.createPost(body);
      // only call ack if the message supports it
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('blog.post.list')
  async handleListPosts(
    @Payload() data: { skip?: number; take?: number },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.blogServiceService.getPosts(
        data.skip ?? 0,
        data.take ?? 10,
      );
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('blog.post.getById')
  async handleGetPost(
    @Payload() data: { id: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.blogServiceService.getPostById(data.id);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('blog.post.getBySlug')
  async handleGetPostBySlug(
    @Payload() data: { slug: string; locale?: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.blogServiceService.getPostBySlug(data.slug, data.locale);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('blog.post.incrementView')
  async handleIncrementPostView(
    @Payload() data: { postId: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.blogServiceService.incrementPostView(data.postId);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('blog.post.getRelated')
  async handleGetRelatedPosts(
    @Payload() data: { postId: string; take?: number },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.blogServiceService.getRelatedPosts(data.postId, data.take || 3);
      if (isAckNackable(originalMsg)) originalMsg.ack();
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) originalMsg.nack();
      throw error;
    }
  }

  // @MessagePattern('blog.post.update')
  // async handleUpdatePost(
  //   @Payload()
  //   data: {
  //     id: string;
  //     title?: string;
  //     slug?: string;
  //     bodyHtml?: string;
  //     categoryId?: string;
  //   },
  //   @Ctx() context: RmqContext,
  // ) {
  //   const channel = context.getChannelRef();
  //   const originalMsg = context.getMessage() as unknown;
  //   try {
  //     const { id, ...updateData } = data;
  //     const result = await this.blogServiceService.updatePost(id, updateData);
  //     if (isAckNackable(originalMsg)) channel.ack(originalMsg);
  //     return result;
  //   } catch (error) {
  //     if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
  //     throw error;
  //   }
  // }

  @MessagePattern('blog.post.delete')
  async handleDeletePost(
    @Payload() data: { id: string; deletedBy?: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.blogServiceService.deletePost(data.id, data.deletedBy);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('blog.post.publish')
  async handlePublishPost(
    @Payload() data: { id: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.blogServiceService.publishPost(data.id);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('blog.post.getByAuthor')
  async handleGetAuthorPosts(
    @Payload() data: { authorId: string; skip?: number; take?: number },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    try {
      const result = await this.blogServiceService.getPostsByAuthor(
        data.authorId,
        data.skip ?? 0,
        data.take ?? 10,
      );
      channel.ack(originalMsg);
      return result;
    } catch (error) {
      channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('blog.post.filter')
  async handleFilterPosts(
    @Payload()
    data: {
      userId?: string;
      category?: string;
      tagName?: string;
      title?: string;
      skip?: number;
      take?: number;
      status?: string;
      locale?: string;
      categoryGroup?: string;
    },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.blogServiceService.getPostsByFilter(
        {
          userId: data.userId,
          category: data.category,
          tagName: data.tagName,
          title: data.title,
          status: data.status,
          locale: data.locale,
          categoryGroup: data.categoryGroup,
        },
        data.skip ?? 0,
        data.take ?? 10,
      );
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('blog.post.share')
  async handleSharePost(
    @Payload() data: { postId: string; userId: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.blogServiceService.sharePost(
        data.postId,
        data.userId,
      );
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('blog.comment.create')
  async handleCreateComment(
    @Payload()
    data: {
      refId: string;
      userId: string;
      bodyHtml?: string;
      parentCommentId?: string;
    },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.blogServiceService.createComment(data);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('blog.comment.list')
  async handleCommentsList(
    @Payload()
    data: {
      pageNo?: number;
      pageSize?: number;
      status?: string;
      sortBy?: string;
      sortType?: 'asc' | 'desc';
      refId?: string;
    },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.blogServiceService.getCommentsList(
        data.pageNo ?? 0,
        data.pageSize ?? 5,
        data.status ?? 'PUBLISHED',
        data.sortBy ?? 'createdAt',
        data.sortType ?? 'desc',
        data.refId,
      );
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('blog.user.posts')
  async handleUserPosts(
    @Payload()
    data: {
      userId: string;
      pageNo?: number;
      pageSize?: number;
      status?: string;
      sortBy?: string;
      sortType?: 'asc' | 'desc';
    },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.blogServiceService.getUserPosts(
        data.userId,
        data.pageNo ?? 0,
        data.pageSize ?? 10,
        data.status,
        data.sortBy ?? 'createdAt',
        data.sortType ?? 'desc',
      );
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('blog.user.activity')
  async handleUserActivity(
    @Payload()
    data: {
      userId: string;
      type?: 'reacted' | 'commented' | 'shared' | 'all';
      pageNo?: number;
      pageSize?: number;
    },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.blogServiceService.getUserActivity(
        data.userId,
        data.type ?? 'all',
        data.pageNo ?? 0,
        data.pageSize ?? 10,
      );
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('blog.reaction.create')
  async handleCreateReaction(
    @Payload()
    data: {
      postId: string;
      userId: string;
      reactionType?: string;
    },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.blogServiceService.createReaction(
        data.postId,
        data.userId,
        data.reactionType,
      );
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('blog.reaction.update')
  async handleUpdateReaction(
    @Payload()
    data: {
      postId: string;
      userId: string;
      reactionType: string;
    },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.blogServiceService.updateReaction(
        data.postId,
        data.userId,
        data.reactionType,
      );
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('blog.reaction.delete')
  async handleDeleteReaction(
    @Payload()
    data: {
      postId: string;
      userId: string;
    },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.blogServiceService.deleteReaction(
        data.postId,
        data.userId,
      );
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('blog.reaction.check')
  async handleCheckUserReaction(
    @Payload()
    data: {
      contentId: string;
      userId: string;
    },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.blogServiceService.checkUserReaction(
        data.contentId,
        data.userId,
      );
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  // ===== Homepage Features RMQ Handlers (migrated) =====

  @MessagePattern('blog.categories')
  async handleGetCategories(
    @Payload() data?: { group?: string },
    @Ctx() context?: RmqContext,
  ) {
    const channel = context?.getChannelRef();
    const originalMsg = context?.getMessage() as unknown;
    try {
      const result = await this.blogServiceService.getCategories(data?.group);
      if (channel && isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (channel && isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('blog.category.create')
  async handleCreateCategory(
    @Payload() data: { name: string; slug: string; description?: string; group?: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.blogServiceService.createCategory(data);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('blog.category.getById')
  async handleGetCategoryById(
    @Payload() data: { id: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.blogServiceService.getCategoryById(data.id);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('blog.category.update')
  async handleUpdateCategory(
    @Payload() data: { id: string; name?: string; slug?: string; description?: string; group?: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const { id, ...updateData } = data;
      const result = await this.blogServiceService.updateCategory(id, updateData);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('blog.category.delete')
  async handleDeleteCategory(
    @Payload() data: { id: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.blogServiceService.deleteCategory(data.id);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('blog.post.assignCategory')
  async handleAssignCategoryToPost(
    @Payload() data: { id: string; categoryId: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.blogServiceService.assignCategoryToPost(data.id, data.categoryId);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('blog.admin.posts')
  async handleGetAdminPosts(
    @Payload() data: { limit?: number },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.blogServiceService.getAdminPosts(data.limit);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('blog.tools.top_rated')
  async handleGetTopRatedTools(
    @Payload() data: { limit?: number; sortBy?: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.blogServiceService.getTopRatedTools(
        data.limit || 4,
        data.sortBy || 'rating:desc',
      );
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('blog.user.new')
  async handleGetNewUserPosts(
    @Payload() data: { page?: number; limit?: number; category?: string; sortBy?: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.blogServiceService.getNewUserPosts(
        data.page || 1,
        data.limit || 10,
        data.category,
        data.sortBy || 'createdAt:desc',
      );
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('blog.featured')
  async handleGetFeaturedPosts(
    @Payload() data: { limit?: number },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.blogServiceService.getFeaturedPosts(data.limit || 5);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  // ===== ADMIN MESSAGE PATTERNS =====

  @MessagePattern('admin.getContent')
  async handleAdminGetContent(@Payload() data: any, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.blogServiceService.getContentAdmin(data);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('admin.getContentById')
  async handleAdminGetContentById(@Payload() data: { contentId: string }, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.blogServiceService.getContentByIdAdmin(data.contentId);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('admin.updateContent')
  async handleAdminUpdateContent(@Payload() data: { contentId: string;[key: string]: any }, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const { contentId, ...updateData } = data;
      const result = await this.blogServiceService.updateContentAdmin(contentId, updateData);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('admin.deleteContent')
  async handleAdminDeleteContent(@Payload() data: { contentId: string }, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      await this.blogServiceService.deleteContentAdmin(data.contentId);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return { success: true };
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('blog.updatePost')
  async handleUpdatePost(@Payload() data: { postId: string;[key: string]: any }, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const { postId, ...updateData } = data;
      const result = await this.blogServiceService.updatePostAdmin(postId, updateData);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('blog.updatePost')
  async handleUpdatePostAdmin(@Payload() data: { postId: string;[key: string]: any }, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const { postId, ...updateData } = data;
      const result = await this.blogServiceService.updatePostAdmin(postId, updateData);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('blog.post.count')
  async handleCountPosts(@Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.blogServiceService.countPosts();
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('admin.publishPost')
  async handleAdminPublishPost(
    @Payload() data: { postId: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.blogServiceService.publishPostAdmin(data.postId);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  // ===== Analytics Message Patterns =====

  @MessagePattern('admin.getPostAnalytics')
  async handleGetPostAnalytics(
    @Payload() data: { postId: string; startDate?: string; endDate?: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.analyticsService.getPostAnalytics(
        data.postId,
        data.startDate,
        data.endDate,
      );
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('admin.getMultiPostAnalytics')
  async handleGetMultiPostAnalytics(
    @Payload() data: { startDate?: string; endDate?: string; limit?: number; offset?: number },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.analyticsService.getMultiPostAnalytics(
        data.startDate,
        data.endDate,
        data.limit || 20,
        data.offset || 0,
      );
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('admin.getTopPostsByEngagement')
  async handleGetTopPostsByEngagement(
    @Payload() data: { startDate?: string; endDate?: string; limit?: number },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.analyticsService.getTopPostsByEngagement(
        data.startDate,
        data.endDate,
        data.limit || 10,
      );
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('admin.getPostAnalyticsTrend')
  async handleGetPostAnalyticsTrend(
    @Payload() data: { postId: string; startDate?: string; endDate?: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.analyticsService.getPostAnalyticsTrend(
        data.postId,
        data.startDate,
        data.endDate,
      );
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('admin.getOverallAnalytics')
  async handleGetOverallAnalytics(
    @Payload() data: { startDate?: string; endDate?: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.analyticsService.getOverallAnalytics(
        data.startDate,
        data.endDate,
      );
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  // ===== Post View Update =====

  @Post(':id/view')
  async updatePostView(@Param('id') id: string) {
    return this.blogServiceService.updatePostView(id);
  }

  @MessagePattern('blog.post.updateView')
  async handleUpdatePostView(
    @Payload() data: { postId: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.blogServiceService.updatePostView(data.postId);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  // ===== Attachment Creation =====

  @MessagePattern('blog.attachment.check')
  async handleCheckAttachment(
    @Payload() data: { attachmentId: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.blogServiceService.checkIfAttachmentExists(
        data.attachmentId,
      );
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return { exists: result };
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('blog.attachment.create')
  async handleCreateAttachment(
    @Payload() data: { mediaId: string; userId: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.blogServiceService.createStatusFeedAttachment(
        data.mediaId,
        data.userId,
      );
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }
}
