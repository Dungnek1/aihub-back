import { Controller, Get, Put, Param, Query, Version } from '@nestjs/common';
import { ApiGatewayService } from '../services/api-gateway.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../decorators';
import type { JwtPayload } from '@app/shared/interface.ts/user.interface';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly apiGateway: ApiGatewayService) { }

  @Get('user/:userId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved' })
  async getUserNotifications(
    @Param('userId') userId: string,
    @Query('skip') skip: number = 0,
    @Query('take') take: number = 20,
  ) {
    return this.apiGateway.forwardToService(
      'NOTIFICATION',
      'notification.get',
      {
        userId,
        skip: Number(skip),
        take: Number(take),
      },
    );
  }

  @Get('user/:userId/all')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all user notifications without pagination' })
  @ApiResponse({ status: 200, description: 'All notifications retrieved' })
  async getAllUserNotifications(@Param('userId') userId: string) {
    return this.apiGateway.forwardToService(
      'NOTIFICATION',
      'notification.get_all',
      {
        userId,
      },
    );
  }

  @Get('unread')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get unread notifications' })
  @ApiResponse({ status: 200, description: 'Unread notifications retrieved' })
  async getUnreadNotifications(
    @CurrentUser() user: JwtPayload,
  ): Promise<unknown> {
    const userId = user.userId;
    return this.apiGateway.forwardToService(
      'NOTIFICATION',
      'notification.get_unread',
      {
        userId,
      },
    );
  }

  @Get('user/:userId/activity')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user activity notifications (where user is the actor)' })
  @ApiResponse({ status: 200, description: 'User activity notifications retrieved' })
  async getUserActivityNotifications(
    @Param('userId') userId: string,
    @Query('skip') skip: number = 0,
    @Query('take') take: number = 20,
  ): Promise<unknown> {
    return this.apiGateway.forwardToService(
      'NOTIFICATION',
      'notification.get_user_activity',
      {
        userId,
        skip: Number(skip),
        take: Number(take),
      },
    );
  }

  @Put(':id/read')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(@Param('id') notificationId: string): Promise<unknown> {
    return this.apiGateway.forwardToService(
      'NOTIFICATION',
      'notification.mark_read',
      {
        notificationId,
      },
    );
  }

  @Put(':id/seen')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Mark notification as seen' })
  @ApiResponse({ status: 200, description: 'Notification marked as seen' })
  async markAsSeen(@Param('id') notificationId: string): Promise<unknown> {
    return this.apiGateway.forwardToService(
      'NOTIFICATION',
      'notification.mark_seen',
      {
        notificationId,
      },
    );
  }

  @Put('read-all')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@CurrentUser() user: JwtPayload): Promise<unknown> {
    const userId = user.userId;
    return this.apiGateway.forwardToService(
      'NOTIFICATION',
      'notification.mark_all_read',
      {
        userId,
      },
    );
  }
}
