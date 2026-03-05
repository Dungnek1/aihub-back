import { Controller, Post, Body } from '@nestjs/common';
import { NotificationServiceService } from '../services/notification-service.service';
import { EventPattern, MessagePattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { JwtPayload } from '@app/shared/interface.ts/user.interface';

// Helper type guard for Rmq message ack/nack
function isAckNackable(msg: unknown): msg is {
  ack: (m?: unknown) => void;
  nack: (m?: unknown, allUpTo?: boolean, requeue?: boolean) => void;
} {
  return (
    typeof msg === 'object' && msg !== null && 'ack' in msg && 'nack' in msg
  );
}

@Controller('notifications')
export class NotificationServiceController {
  constructor(
    private readonly notificationService: NotificationServiceService,
  ) { }

  // ===== RabbitMQ Message Pattern Handlers =====

  @EventPattern('blog.post.created')
  async handleNewPost(
    @Payload()
    data: {
      postId: string;
      authorId: string;
      followersIds: string[];
      title: string;
    },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.notificationService.handleNewPost(data);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('user.followed')
  async handleNewFollower(
    @Payload()
    data: {
      user: JwtPayload;
      followedId: string;

    },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.notificationService.handleNewFollower(data);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('notification.get_all')
  async getAllNotifications(
    @Payload() data: { userId: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.notificationService.getAllNotifications(data.userId);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('notification.get')
  async getNotificationsMessage(
    @Payload() data: { userId: string; skip?: number; take?: number },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.notificationService.getNotifications(
        data.userId,
        data.skip || 0,
        data.take || 20,
      );
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('notification.get_unread')
  async getUnreadNotificationsMessage(
    @Payload() data: { userId: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.notificationService.getUserActivityNotifications(data.userId);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('notification.create')
  async handleCreateNotification(
    @Payload()
    data: {
      type: string;
      actorId?: string;
      objectType?: string;
      objectId?: string;
      recipientId: string;
      context?: string;
    },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.notificationService.createNotification(data as any);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @EventPattern('blog.reaction.created')
  async handleReactionOnPostEvent(
    @Payload()
    data: {
      postId: string;
      reactionId: string;
      reactorId: string;
      authorId: string;
      reactionType: string;
    },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.notificationService.handleReactionOnPost(data);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @EventPattern('blog.comment.created')
  async handleCommentOnPostEvent(
    @Payload()
    data: {
      postId: string;
      commentId: string;
      commenterId: string;
      authorId: string | null;
      commenterName: string;
      commentsCount: number;
    },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.notificationService.handleCommentOnPost(data);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @EventPattern('auth.user.registered')
  async handleUserRegistered(
    @Payload() data: { userId: string; email: string; username: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      // Send verification email
      await this.notificationService.sendVerificationEmail(data);

      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return { ok: true, message: 'Verification email sent successfully' };
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('verify-email')
  async verifyEmail(
    @Payload() data: { userId: string; code: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.notificationService.verifyEmailCode(data.userId, data.code);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('resend-verification-email')
  async resendVerificationEmail(
    @Payload() data: { userId: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.notificationService.resendVerificationEmail(data.userId);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('notification.mark_read')
  async markAsReadMessage(
    @Payload() data: { notificationId: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.notificationService.markAsRead(data.notificationId);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('notification.mark_seen')
  async markAsSeenMessage(
    @Payload() data: { notificationId: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.notificationService.markAsSeen(data.notificationId);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('notification.mark_all_read')
  async markAllAsReadMessage(
    @Payload() data: { userId: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.notificationService.markAllAsRead(data.userId);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @Post('verify-email')
  async verifyEmailREST(
    @Body() body: { userId: string; code: string },
  ) {
    return this.notificationService.verifyEmailCode(body.userId, body.code);
  }

  @Post('resend-verification')
  async resendVerificationREST(
    @Body() body: { userId: string },
  ) {
    return this.notificationService.resendVerificationEmail(body.userId);
  }

  // ===== ADMIN MESSAGE PATTERNS =====

  @MessagePattern('admin.getNotifications')
  async handleAdminGetNotifications(@Payload() data: any, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.notificationService.getNotificationsAdmin(data);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('admin.createNotification')
  async handleAdminCreateNotification(@Payload() data: any, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.notificationService.createNotificationAdmin(data);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('admin.getSupportTickets')
  async handleAdminGetSupportTickets(@Payload() data: any, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const result = await this.notificationService.getSupportTicketsAdmin(data);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @MessagePattern('admin.updateSupportTicket')
  async handleAdminUpdateSupportTicket(@Payload() data: { ticketId: string;[key: string]: any }, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage() as unknown;
    try {
      const { ticketId, ...updateData } = data;
      const result = await this.notificationService.updateSupportTicketAdmin(ticketId, updateData);
      if (isAckNackable(originalMsg)) channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (isAckNackable(originalMsg)) channel.nack(originalMsg, false, true);
      throw error;
    }
  }
}
