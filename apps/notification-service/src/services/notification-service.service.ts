import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@app/redis';
import { ClientProxy } from '@nestjs/microservices';

import {
  NotificationType,
  DeliveryChannel,
  DeliveryStatus,
} from '@app/common/constant/enum';
import { generateVerificationEmail } from '../templates/email.verify.signup';
import { generateNewFollowerNotificationHtml } from '../templates/notification.new_follower';
import { JwtPayload } from '@app/shared/interface.ts/user.interface';
import { generateNewPostNotificationHtml } from '../templates/notification.new_post';
import { generateReactionNotificationHtml } from '../templates/notification.reaction';
import { generateCommentNotificationHtml } from '../templates/notification.comment';
import { generateNewToolNotificationHtml } from '../templates/notification.new_tool';
import { generateToolRatedNotificationHtml } from '../templates/notification.tool_rated';
import { generatePostPendingReviewNotificationHtml } from '../templates/notification.post_pending_review';
import { NotificationGateway } from '../notification.gateway';


interface CreateNotificationDto {
  recipientId: string;
  type: NotificationType;
  eventId?: string;
  actorId?: string;
  objectType?: string;
  objectId?: string;
  context?: string;
  createdBy?: string;
}

interface SendNotificationDto {
  notificationId: string;
  channel: DeliveryChannel;
}

@Injectable()
export class NotificationServiceService {
  private readonly logger = new Logger(NotificationServiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly notificationGateway: NotificationGateway,
  ) { }

  async createNotification(data: CreateNotificationDto) {
    let eventId = data.eventId;

    const notificationType = typeof data.type === 'string'
      ? data.type.toLowerCase()
      : data.type;

    if (!eventId && data.actorId && data.objectType && data.objectId) {
      // Create event if not provided
      // Convert NotificationType enum from UPPERCASE to lowercase for Prisma


      const event = await this.prisma.notificationEvent.create({
        data: {
          //@ts-ignore
          type: notificationType,
          actorId: data.actorId,
          objectType: data.objectType,
          objectId: data.objectId,
          context: data.context,
          createdBy: data.createdBy,
        },
      });
      eventId = event.id;
    }

    const notification = await this.prisma.notifications.create({
      data: {
        recipientId: data.recipientId,
        //@ts-ignore
        type: notificationType,
        eventId,
        createdBy: data.createdBy,
      },
      include: {
        recipient: true,
        event: true,
      },
    });

    // Generate HTML content based on type
    let htmlContent = '';
    if (eventId) {
      const event = await this.prisma.notificationEvent.findUnique({
        where: { id: eventId },
      });
      if (event && event.context) {


        try {
          const contextData = JSON.parse(event.context);

          switch (event.type) {
            case NotificationType.NEW_POST_FROM_FOLLOWING:
              // For new posts from following, we need to get the actor's details
              if (event.actorId) {
                const poster = await this.prisma.user.findUnique({
                  where: { userId: event.actorId },
                  select: { username: true, avatarUrl: true },
                });
                htmlContent = generateNewPostNotificationHtml({
                  avatarUrl: poster?.avatarUrl || '',
                  username: poster?.username || '',
                  title: contextData.postTitle || '',
                });
              }
              break;

            //@ts-ignore
            case NotificationType.POST_PENDING_REVIEW:
              // For posts pending review (admin notification), we need to get the author's details
              if (event.actorId) {
                const author = await this.prisma.user.findUnique({
                  where: { userId: event.actorId },
                  select: { username: true, avatarUrl: true },
                });
                htmlContent = generatePostPendingReviewNotificationHtml({
                  avatarUrl: author?.avatarUrl || '',
                  username: author?.username || '',
                  postTitle: contextData.postTitle || '',
                });
              }
              break;

            //@ts-ignore
            case NotificationType.NEW_TOOL:
              // For new tools, we need to get the actor's details and tool info
              if (event.actorId) {
                const creator = await this.prisma.user.findUnique({
                  where: { userId: event.actorId },
                  select: { username: true, avatarUrl: true },
                });
                htmlContent = generateNewToolNotificationHtml({
                  avatarUrl: creator?.avatarUrl || '',
                  username: creator?.username || '',
                  toolName: contextData.toolName || '',
                });
              }
              break;

            case NotificationType.NEW_FOLLOWER:
              // For new followers, we need to get the actor's details
              if (event.actorId) {
                const follower = await this.prisma.user.findUnique({
                  where: { userId: event.actorId },
                  select: { username: true, avatarUrl: true },
                });
                htmlContent = generateNewFollowerNotificationHtml({
                  avatarUrl: follower?.avatarUrl || '',
                  username: follower?.username || '',
                });
              }
              break;

            case NotificationType.COMMENT_ON_POST:
              // For comments, we need to get the actor's details
              if (event.actorId) {
                const commenter = await this.prisma.user.findUnique({
                  where: { userId: event.actorId },
                  select: { username: true, avatarUrl: true },
                });
                htmlContent = generateCommentNotificationHtml({
                  avatarUrl: commenter?.avatarUrl || '',
                  username: commenter?.username || '',
                  postTitle: contextData.postTitle || '',
                  commentsCount: contextData.commentsCount || 0,
                });
              }
              break;

            case NotificationType.REACTION_ON_POST:
              // For reactions, we need to get the actor's details
              if (event.actorId) {
                const reactor = await this.prisma.user.findUnique({
                  where: { userId: event.actorId },
                  select: { username: true, avatarUrl: true },
                });

                if (contextData.target === 'author') {
                  htmlContent = generateReactionNotificationHtml({
                    avatarUrl: reactor?.avatarUrl || '',
                    username: reactor?.username || '',
                    reactionType: contextData.reactionType || 'LIKE',
                    postTitle: contextData.postTitle || '',
                  });
                } else if (contextData.target === 'reactors') {
                  // For reactor notifications, we might need a different template
                  // For now, use the same template
                  htmlContent = generateReactionNotificationHtml({
                    avatarUrl: reactor?.avatarUrl || '',
                    username: reactor?.username || '',
                    reactionType: contextData.reactionType || 'LIKE',
                    postTitle: contextData.postTitle || '',
                  });
                }
              }
              break;

            //@ts-ignore
            case NotificationType.TOOL_RATED:
              // For tool ratings
              if (event.actorId) {
                const rater = await this.prisma.user.findUnique({
                  where: { userId: event.actorId },
                  select: { username: true, avatarUrl: true },
                });
                htmlContent = generateToolRatedNotificationHtml({
                  avatarUrl: rater?.avatarUrl || '',
                  username: rater?.username || 'Someone',
                  toolName: contextData.toolName || 'Tool',
                  stars: contextData.stars || 0,
                  newAvgRating: contextData.newAvgRating || 0,
                });
              }
              break;

            default:
              htmlContent = '';
          }
        } catch (error) {
          this.logger.error('Error parsing notification context or generating HTML', error);
          htmlContent = '';
        }
      }
    }

    // Send real-time notification via WebSocket through API Gateway
    this.notificationGateway.sendNotificationToUser(data.recipientId, {
      id: notification.id,
      type: data.type,
      html: htmlContent,
      createdAt: notification.createdAt,
      isRead: false,
      isSeen: false,
    });

    // Create delivery record for tracking
    await this.createDelivery(notification.id, DeliveryChannel.PUSH_NOTIFICATION, data.createdBy);

    return notification;
  }

  async getNotifications(userId: string, skip = 0, take = 20) {
    return this.prisma.notifications.findMany({
      where: { recipientId: userId },
      skip,
      take,
      include: {
        recipient: true,
        event: true,
        deliveries: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllNotifications(userId: string) {
    return this.prisma.notifications.findMany({
      where: { recipientId: userId },
      include: {
        recipient: true,
        event: true,
        deliveries: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUnreadNotifications(userId: string) {
    return this.prisma.notifications.findMany({
      where: {
        recipientId: userId,
        isRead: false,
      },
      include: {
        recipient: true,
        event: true,
        deliveries: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserActivityNotifications(userId: string, skip = 0, take = 20) {
    const notifications = await this.prisma.notifications.findMany({
      where: {
        recipientId: userId,
        OR: [
          { isRead: false }
        ],
      },
      include: {
        event: true,
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    // Generate HTML content for each notification based on event type
    const notificationsWithHtml = await Promise.all(
      notifications.map(async (notification) => {
        let htmlContent = '';
        const event = notification.event;

        if (event && event.context) {
          try {
            const contextData = JSON.parse(event.context);

            switch (event.type) {
              case NotificationType.NEW_POST_FROM_FOLLOWING:
                // For new posts from following, we need to get the actor's details
                if (event.actorId) {
                  const poster = await this.prisma.user.findUnique({
                    where: { userId: event.actorId },
                    select: { username: true, avatarUrl: true },
                  });
                  htmlContent = generateNewPostNotificationHtml({
                    avatarUrl: poster?.avatarUrl || '',
                    username: poster?.username || '',
                    title: contextData.postTitle || '',
                  });
                }
                break;

              //@ts-ignore
              case NotificationType.POST_PENDING_REVIEW:
                // For posts pending review (admin notification), we need to get the author's details
                if (event.actorId) {
                  const author = await this.prisma.user.findUnique({
                    where: { userId: event.actorId },
                    select: { username: true, avatarUrl: true },
                  });
                  htmlContent = generatePostPendingReviewNotificationHtml({
                    avatarUrl: author?.avatarUrl || '',
                    username: author?.username || '',
                    postTitle: contextData.postTitle || '',
                  });
                }
                break;

              //@ts-ignore
              case NotificationType.NEW_TOOL:
                // For new tools, we need to get the actor's details and tool info
                if (event.actorId) {
                  const creator = await this.prisma.user.findUnique({
                    where: { userId: event.actorId },
                    select: { username: true, avatarUrl: true },
                  });
                  htmlContent = generateNewToolNotificationHtml({
                    avatarUrl: creator?.avatarUrl || '',
                    username: creator?.username || '',
                    toolName: contextData.toolName || '',
                  });
                }
                break;

              case NotificationType.NEW_FOLLOWER:
                // For new followers, we need to get the actor's details
                if (event.actorId) {
                  const follower = await this.prisma.user.findUnique({
                    where: { userId: event.actorId },
                    select: { username: true, avatarUrl: true },
                  });
                  htmlContent = generateNewFollowerNotificationHtml({
                    avatarUrl: follower?.avatarUrl || '',
                    username: follower?.username || '',
                  });
                }
                break;

              case NotificationType.COMMENT_ON_POST:
                // For comments, we need to get the actor's details
                if (event.actorId) {
                  const commenter = await this.prisma.user.findUnique({
                    where: { userId: event.actorId },
                    select: { username: true, avatarUrl: true },
                  });
                  htmlContent = generateCommentNotificationHtml({
                    avatarUrl: commenter?.avatarUrl || '',
                    username: commenter?.username || '',
                    postTitle: contextData.postTitle || '',
                    commentsCount: contextData.commentsCount || 0,
                  });
                }
                break;

              case NotificationType.REACTION_ON_POST:
                // For reactions, we need to get the actor's details
                if (event.actorId) {
                  const reactor = await this.prisma.user.findUnique({
                    where: { userId: event.actorId },
                    select: { username: true, avatarUrl: true },
                  });

                  if (contextData.target === 'author') {
                    htmlContent = generateReactionNotificationHtml({
                      avatarUrl: reactor?.avatarUrl || '',
                      username: reactor?.username || '',
                      reactionType: contextData.reactionType || 'LIKE',
                      postTitle: contextData.postTitle || '',
                    });
                  } else if (contextData.target === 'reactors') {
                    // For reactor notifications, we might need a different template
                    // For now, use the same template
                    htmlContent = generateReactionNotificationHtml({
                      avatarUrl: reactor?.avatarUrl || '',
                      username: reactor?.username || '',
                      reactionType: contextData.reactionType || 'LIKE',
                      postTitle: contextData.postTitle || '',
                    });
                  }
                }
                break;

              //@ts-ignore
              case NotificationType.TOOL_RATED:
                // For tool ratings
                if (event.actorId) {
                  const rater = await this.prisma.user.findUnique({
                    where: { userId: event.actorId },
                    select: { username: true, avatarUrl: true },
                  });
                  htmlContent = generateToolRatedNotificationHtml({
                    avatarUrl: rater?.avatarUrl || '',
                    username: rater?.username || 'Someone',
                    toolName: contextData.toolName || 'Tool',
                    stars: contextData.stars || 0,
                    newAvgRating: contextData.newAvgRating || 0,
                  });
                }
                break;

              default:
                htmlContent = '';
            }
          } catch (error) {
            this.logger.error('Error parsing notification context or generating HTML', error);
            htmlContent = '';
          }
        }

        return {
          id: notification.id,
          type: notification.type,
          html: htmlContent,
          createdAt: notification.createdAt,
          isRead: notification.isRead,
          isSeen: notification.isSeen,
          event: {
            id: event?.id,
            type: event?.type,
            actorId: event?.actorId,
            objectType: event?.objectType,
            objectId: event?.objectId,
          },
        };
      })
    );

    return notificationsWithHtml;
  }



  async markAsRead(notificationId: string) {
    return this.prisma.notifications.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        updatedAt: new Date(),
      },
      include: {
        recipient: true,
        event: true,
        deliveries: true,
      },
    });
  }

  async markAsSeen(notificationId: string) {
    return this.prisma.notifications.update({
      where: { id: notificationId },
      data: {
        isSeen: true,
        updatedAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notifications.updateMany({
      where: {
        recipientId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
        updatedAt: new Date(),
      },
    });
  }

  async createDelivery(notificationId: string, channel: DeliveryChannel, createdBy?: string) {
    return this.prisma.notificationDelivery.create({
      data: {
        notificationId,
        channel,
        status: DeliveryStatus.QUEUED,
        createdBy,
      },
    });
  }

  async updateDeliveryStatus(deliveryId: string, status: DeliveryStatus) {
    return this.prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data: {
        status,
        updatedAt: new Date(),
      },
    });
  }

  async getDeliveries(notificationId: string) {
    return this.prisma.notificationDelivery.findMany({
      where: { notificationId },
    });
  }

  async deleteNotification(notificationId: string) {
    return this.prisma.notifications.delete({
      where: { id: notificationId },
    });
  }

  // Event handler methods
  async handleNewPost(data: {
    postId: string;
    authorId: string;
    followersIds: string[];
    title: string;
  }) {
    this.logger.log(`Handling new post event: ${data.postId}`);

    // Fetch author details
    const author = await this.prisma.user.findUnique({
      where: { userId: data.authorId },
      select: { username: true, avatarUrl: true },
    });

    if (!author) {
      throw new Error('Author not found');
    }

    // Create notification event
    const event = await this.prisma.notificationEvent.create({
      data: {
        type: NotificationType.NEW_POST_FROM_FOLLOWING,
        actorId: data.authorId,
        objectType: 'Post',
        objectId: data.postId,
        context: JSON.stringify({
          avatarUrl: author.avatarUrl || '',
          username: author.username,
          title: data.title,
        }),
        createdBy: data.authorId,
      },
    });

    // Create notifications for all followers and send real-time notifications
    for (const followerId of data.followersIds) {
      await this.createNotification({
        recipientId: followerId,
        type: NotificationType.NEW_POST_FROM_FOLLOWING,
        eventId: event.id,
        actorId: data.authorId,
        objectType: 'Post',
        objectId: data.postId,
        createdBy: data.authorId,
      });
    }

    return { ok: true, eventId: event.id };
  }

  async handleNewFollower(data: {

    followedId: string;
    user: JwtPayload;
  }) {
    this.logger.log(
      `Handling new follower event: ${data.user.userId} -> ${data.followedId}`,
    );

    // Fetch follower details including avatarUrl
    const follower = await this.prisma.user.findUnique({
      where: { userId: data.user.userId },
      select: { username: true, avatarUrl: true },
    });

    if (!follower) {
      throw new Error('Follower not found');
    }

    const event = await this.prisma.notificationEvent.create({
      data: {
        type: NotificationType.NEW_FOLLOWER,
        actorId: data.user.userId,
        objectType: 'User',
        objectId: data.followedId,
        context: JSON.stringify({
          avatarUrl: follower.avatarUrl || '',
          username: follower.username,
        }),
        createdBy: data.user.userId,
      },
    });

    await this.createNotification({
      recipientId: data.followedId,
      type: NotificationType.NEW_FOLLOWER,
      eventId: event.id,
      actorId: data.user.userId,
      objectType: 'User',
      objectId: data.followedId,
      createdBy: data.user.userId,
    });

    return { ok: true, eventId: event.id };
  }

  async handleCommentOnPost(data: {
    postId: string;
    commentId: string;
    commenterId: string;
    authorId: string | null;
    commenterName: string;
    commentsCount: number;
  }) {
    this.logger.log(`Handling comment event on post: ${data.postId}`);

    // Get post details to find the author
    const post = await this.prisma.post.findUnique({
      where: { contentId: data.postId },
      select: {
        id: true,
        title: true,
        content: {
          select: {
            authorId: true,
          },
        },
      },
    });

    if (!post) {
      throw new Error(`Post with contentId ${data.postId} not found`);
    }

    const postAuthorId = post.content.authorId;

    // Find all users who have commented on this post (excluding the commenter)
    const commentingUsers = await this.prisma.comment.findMany({
      where: {
        refId: data.postId,
        targetType: 'COMMENT',
        userId: { not: data.commenterId }, // Exclude the commenter themselves
      },
      select: {
        userId: true,
      },
      distinct: ['userId'],
    });

    const notifiedUsers: string[] = [];

    // Create notification event
    const event = await this.prisma.notificationEvent.create({
      data: {
        type: NotificationType.COMMENT_ON_POST,
        actorId: data.commenterId,
        objectType: 'Post',
        objectId: post.id,
        context: JSON.stringify({
          commentId: data.commentId,
          postTitle: post.title,
          commentsCount: data.commentsCount,
        }),
        createdBy: data.commenterId,
      },
    });

    // Notify all users who have commented on this post
    for (const user of commentingUsers) {
      if (user.userId !== data.commenterId) { // Double check exclusion
        await this.createNotification({
          recipientId: user.userId,
          type: NotificationType.COMMENT_ON_POST,
          eventId: event.id,
          actorId: data.commenterId,
          objectType: 'Post',
          objectId: post.id,
          createdBy: data.commenterId,
        });
        notifiedUsers.push(user.userId);
      }
    }

    // Also notify the post author if they haven't commented and aren't the commenter
    if (postAuthorId !== data.commenterId && !notifiedUsers.includes(postAuthorId)) {
      await this.createNotification({
        recipientId: postAuthorId,
        type: NotificationType.COMMENT_ON_POST,
        eventId: event.id,
        actorId: data.commenterId,
        objectType: 'Post',
        objectId: post.id,
        createdBy: data.commenterId,
      });
      notifiedUsers.push(postAuthorId);
    }

    // Send real-time notification to all notified users
    for (const userId of notifiedUsers) {
      // Generate HTML content for the notification
      let htmlContent = '';
      try {
        const actor = await this.prisma.user.findUnique({
          where: { userId: data.commenterId },
          select: { username: true, avatarUrl: true },
        });

        if (actor) {
          htmlContent = generateCommentNotificationHtml(
            {
              avatarUrl: actor.avatarUrl || '',
              username: actor.username,
              postTitle: post.title,
              commentsCount: data.commentsCount,
            }
          );
        }
      } catch (error) {
        this.logger.error('Error generating comment notification HTML', error);
      }

      // Send real-time notification via WebSocket through API Gateway
      // this.apiGatewayClient.emit('notification.send', {
      //   userId: userId,
      //   notification: {
      //     id: `comment-${event.id}-${userId}`,
      //     type: NotificationType.COMMENT_ON_POST,
      //     html: htmlContent,
      //     createdAt: new Date(),
      //     isRead: false,
      //     isSeen: false,
      //     metadata: {
      //       postId: post.id,
      //       commentId: data.commentId,
      //       commentsCount: data.commentsCount,
      //     },
      //   }
      // });
      this.notificationGateway.sendNotificationToUser(userId, {
        id: `comment-${event.id}-${userId}`,
        type: NotificationType.COMMENT_ON_POST,
        html: htmlContent,
        createdAt: new Date(),
        isRead: false,
        isSeen: false,
        metadata: {
          postId: post.id,
          commentId: data.commentId,
          commentsCount: data.commentsCount,
        },
      });
    }

    return { ok: true, eventId: event.id, notifiedUsers, commentsCount: data.commentsCount };
  }

  async handleReactionOnPost(data: {
    postId: string;
    reactionId: string;
    reactorId: string;
    authorId: string;
    reactionType: string;
  }) {
    this.logger.log(`Handling reaction event on post: ${data.postId}`);

    // Get the post details
    const post = await this.prisma.post.findUnique({
      where: { id: data.postId },
      select: {
        contentId: true,
        title: true,
      },
    });
    if (!post) {
      throw new Error('Post not found');
    }

    // Query reactions of the same type on this post (excluding current reactor)
    const sameTypeReactions = await this.prisma.reaction.findMany({
      where: {
        refId: post.contentId,
        targetType: 'POST',
        reactionType: data.reactionType as any,
        userId: { not: data.reactorId }, // Exclude current reactor
      },
      select: { userId: true },
    });

    const notifiedUsers: string[] = [];

    // Always notify the author (if not the reactor themselves)
    if (data.authorId !== data.reactorId) {
      const authorEvent = await this.prisma.notificationEvent.create({
        data: {
          type: NotificationType.REACTION_ON_POST,
          actorId: data.reactorId,
          objectType: 'Post',
          objectId: data.postId,
          context: JSON.stringify({
            reactionId: data.reactionId,
            reactionType: data.reactionType,
            target: 'author',
            postTitle: post.title,
          }),
          createdBy: data.reactorId,
        },
      });

      await this.createNotification({
        recipientId: data.authorId,
        type: NotificationType.REACTION_ON_POST,
        eventId: authorEvent.id,
        actorId: data.reactorId,
        objectType: 'Post',
        objectId: data.postId,
        createdBy: data.reactorId,
      });
      notifiedUsers.push(data.authorId);
    }

    // Notify other reactors of the same type (if any)
    if (sameTypeReactions.length > 0) {
      const reactorEvent = await this.prisma.notificationEvent.create({
        data: {
          type: NotificationType.REACTION_ON_POST,
          actorId: data.reactorId,
          objectType: 'Post',
          objectId: data.postId,
          context: JSON.stringify({
            reactionId: data.reactionId,
            reactionType: data.reactionType,
            target: 'reactors',
            reactionCount: sameTypeReactions.length,
            postTitle: post.title,
          }),
          createdBy: data.reactorId,
        },
      });

      for (const reaction of sameTypeReactions) {
        if (reaction.userId !== data.reactorId && reaction.userId !== data.authorId) {
          await this.createNotification({
            recipientId: reaction.userId,
            type: NotificationType.REACTION_ON_POST,
            eventId: reactorEvent.id,
            actorId: data.reactorId,
            objectType: 'Post',
            objectId: data.postId,
            createdBy: data.reactorId,
          });
          notifiedUsers.push(reaction.userId);
        }
      }
    }

    return { ok: true, notifiedUsers };
  }

  // Email verification methods
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
  }

  async sendVerificationEmail(data: {
    userId: string;
    email: string;
    username: string;
  }) {
    try {
      // Generate 6-digit OTP
      const otp = this.generateOTP();
      
      this.logger.log(`Generated OTP for user ${data.userId}: "${otp}" (type: ${typeof otp}, length: ${otp.length})`);

      // Store OTP in Redis with 5 minutes expiration
      await this.redisService.set(`otp:${data.userId}`, otp, 300); // 300 seconds = 5 minutes
      
      // Verify it was stored correctly
      const storedValue = await this.redisService.get(`otp:${data.userId}`);
      this.logger.log(`OTP stored in Redis for user ${data.userId}: "${storedValue}" (type: ${typeof storedValue}, length: ${storedValue?.length})`);

      // Generate HTML email
      const htmlContent = generateVerificationEmail({
        username: data.username,
        verificationCode: otp,
        companyName: this.configService.get('NAME_COMPANY') || 'AI Hub',
        logoUrl: this.configService.get('LOGO_URL_COMPANY') || '',
        hotline: this.configService.get('HOTLINE') || '1900-xxxx',
        supportEmail: this.configService.get('EMAIL_COMPANY') || 'support@aihub.com',
      });

      // Create delivery record for email verification
      // Since this is not a user notification but an email delivery, we'll create a minimal notification record
      const notification = await this.prisma.notifications.create({
        data: {
          recipientId: data.userId,
          type: NotificationType.ADMIN_ACTION, // Using admin action as closest type
          eventId: null, // No event for email verification
          createdBy: data.userId,
        },
      });

      const delivery = await this.createDelivery(notification.id, DeliveryChannel.EMAIL, data.userId);

      // Send email with OTP
      try {
        await this.mailerService.sendMail({
          to: data.email,
          subject: `Account Verification ${this.configService.get('NAME_COMPANY') || 'AI Hub'}`,
          html: htmlContent,
        });

        // Update delivery status to sent
        await this.updateDeliveryStatus(delivery.id, DeliveryStatus.SEND);
      } catch (emailError) {
        // Update delivery status to failed
        await this.updateDeliveryStatus(delivery.id, DeliveryStatus.FAILED);
        throw emailError;
      }

      this.logger.log(`Verification email sent to ${data.email}`);
      return {
        success: true,
        message: 'Verification email sent successfully'
      };
    } catch (error) {
      this.logger.error(`Error sending verification email: ${error.message}`);
      throw error;
    }
  }

  async verifyEmailCode(userId: string, code: string) {
    try {
      // Trim whitespace from code
      const cleanCode = code?.toString().trim();
      
      // Get OTP from Redis
      const storedOTP = await this.redisService.get(`otp:${userId}`);
      
      this.logger.log(`Email verification attempt for user ${userId}`);
      this.logger.log(`Stored OTP: "${storedOTP}" (type: ${typeof storedOTP}, length: ${storedOTP?.length})`);
      this.logger.log(`Provided code: "${cleanCode}" (type: ${typeof cleanCode}, length: ${cleanCode?.length})`);
      this.logger.log(`Comparison: stored="${storedOTP}", provided="${cleanCode}", match=${storedOTP === cleanCode}`);

      if (!storedOTP) {
        this.logger.warn(`OTP not found or expired for user ${userId}`);
        return {
          success: false,
          message: 'Mã xác thực không tồn tại hoặc đã hết hạn',
        };
      }

      // Compare trimmed codes
      if (storedOTP.toString().trim() !== cleanCode) {
        this.logger.warn(`Invalid OTP code for user ${userId}. Expected: "${storedOTP}", Got: "${cleanCode}"`);
        return {
          success: false,
          message: 'Mã xác thực không chính xác. Vui lòng kiểm tra lại',
        };
      }

      // Delete OTP after successful verification
      await this.redisService.del(`otp:${userId}`);

      // Update user as verified
      await this.prisma.user.update({
        where: { userId },
        data: {
          emailVerified: true,
          updatedAt: new Date(),
          updatedBy: userId,
        },
      });

      this.logger.log(`Email verified successfully for user ${userId}`);
      return {
        success: true,
        message: 'Email đã được xác thực thành công',
      };
    } catch (error) {
      this.logger.error(`Email verification failed: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Lỗi khi xác thực email. Vui lòng thử lại',
      };
    }
  }

  async resendVerificationEmail(userId: string) {
    try {
      // Get user details
      const user = await this.prisma.user.findUnique({
        where: { userId },
      });

      if (!user) {
        return {
          success: false,
          message: 'Người dùng không tồn tại',
        };
      }

      if (user.emailVerified) {
        return {
          success: false,
          message: 'Email đã được xác thực trước đó',
        };
      }

      // Check if there's an existing OTP (rate limiting)
      const existingOTP = await this.redisService.get(`otp:${userId}`);
      if (existingOTP) {
        return {
          success: false,
          message: 'Mã xác thực đã được gửi. Vui lòng kiểm tra email hoặc thử lại sau 5 phút.',
        };
      }

      // Send new verification email
      await this.sendVerificationEmail({
        userId: user.userId,
        email: user.email,
        username: user.username,
      });

      return {
        success: true,
        message: 'Mã xác thực mới đã được gửi đến email của bạn',
      };
    } catch (error) {
      this.logger.error(`Failed to resend verification email: ${error.message}`);
      return {
        success: false,
        message: 'Lỗi khi gửi lại mã xác thực',
      };
    }
  }

  // ===== ADMIN METHODS =====

  async getNotificationsAdmin(query: {
    page?: number;
    limit?: number;
    recipientId?: string;
    type?: string;
  }): Promise<{ items: any[]; total: number }> {
    const { page = 0, limit = 20, recipientId, type } = query;

    const where: any = {};

    if (recipientId) {
      where.recipientId = recipientId;
    }

    if (type) {
      where.type = type;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notifications.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: page * limit,
        take: limit,
      }),
      this.prisma.notifications.count({ where }),
    ]);

    return { items: notifications, total };
  }

  async createNotificationAdmin(data: {
    recipientId: string;
    type: NotificationType;
    eventId?: string;
  }): Promise<any> {
    const notification = await this.prisma.notifications.create({
      data: {
        recipientId: data.recipientId,
        type: data.type as any,
        eventId: data.eventId,
        isRead: false,
        isSeen: false,
        createdBy: 'admin',
      },
    });

    // Send real-time notification
    this.notificationGateway.sendNotificationToUser(data.recipientId, {
      id: notification.id,
      type: notification.type,
      eventId: notification.eventId,
      isRead: notification.isRead,
      isSeen: notification.isSeen,
      createdAt: notification.createdAt,
    });

    return notification;
  }

  async getSupportTicketsAdmin(query: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
  }): Promise<{ items: any[]; total: number }> {
    const { page = 0, limit = 20, status, priority } = query;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        include: {
          user: { select: { userId: true, username: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: page * limit,
        take: limit,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return { items: tickets, total };
  }

  async updateSupportTicketAdmin(ticketId: string, data: any): Promise<any> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new Error('Support ticket not found');
    }

    const updatedTicket = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data,
      include: {
        user: { select: { userId: true, username: true, name: true, email: true } },
      },
    });

    return updatedTicket;
  }
}
