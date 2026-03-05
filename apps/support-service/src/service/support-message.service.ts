import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from '@app/database';
import { MessageSenderType } from '@prisma/client';

interface CreateMessageDto {
    ticketId: string;
    senderId?: string;
    agentId?: string;
    senderType: MessageSenderType;
    content: string;
    isInternal?: boolean;
    attachments?: string[];
    createdBy?: string;
}

interface UpdateMessageDto {
    content?: string;
}

interface ListMessageQuery {
    page?: number;
    limit?: number;
    senderType?: MessageSenderType;
}

@Injectable()
export class SupportMessageService {
    private readonly logger = new Logger(SupportMessageService.name);

    constructor(private readonly prisma: PrismaService) { }

    async createMessage(data: CreateMessageDto) {
        try {
            // Verify ticket exists
            const ticket = await this.prisma.supportTicket.findUnique({
                where: { id: data.ticketId },
            });

            if (!ticket) {
                throw new RpcException('Ticket not found');
            }

            const message = await this.prisma.supportMessage.create({
                data: {
                    ticketId: data.ticketId,
                    senderId: data.senderId,
                    agentId: data.agentId,
                    senderType: data.senderType,
                    content: data.content,
                    isInternal: data.isInternal || false,
                    isRead: false,
                    attachments: data.attachments || [],
                    createdBy: data.createdBy,
                },
            });

            // Update ticket updatedAt
            await this.prisma.supportTicket.update({
                where: { id: data.ticketId },
                data: { updatedAt: new Date() },
            });

            this.logger.log(`Message created: ${message.id}`);
            return message;
        } catch (error) {
            this.logger.error(`Failed to create message: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async getMessages(ticketId: string, query: ListMessageQuery) {
        try {
            // Verify ticket exists
            const ticket = await this.prisma.supportTicket.findUnique({
                where: { id: ticketId },
            });

            if (!ticket) {
                throw new RpcException('Ticket not found');
            }

            const page = query.page || 1;
            const limit = query.limit || 20;
            const skip = (page - 1) * limit;

            const where: any = { ticketId };
            if (query.senderType) where.senderType = query.senderType;

            const [messages, total] = await Promise.all([
                this.prisma.supportMessage.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'asc' },
                    include: {
                        sender: {
                            select: {
                                userId: true,
                                username: true,
                                email: true,
                                avatarUrl: true,
                            },
                        },
                        agent: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                }),
                this.prisma.supportMessage.count({ where }),
            ]);

            return {
                data: messages,
                total,
                page,
                limit,
            };
        } catch (error) {
            this.logger.error(`Failed to fetch messages: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async getMessageById(ticketId: string, messageId: string) {
        try {
            const message = await this.prisma.supportMessage.findUnique({
                where: { id: messageId },
                include: {
                    sender: {
                        select: {
                            userId: true,
                            username: true,
                            email: true,
                            avatarUrl: true,
                        },
                    },
                    agent: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            });

            if (!message || message.ticketId !== ticketId) {
                throw new RpcException('Message not found');
            }

            return message;
        } catch (error) {
            this.logger.error(`Failed to fetch message: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async updateMessage(ticketId: string, messageId: string, data: UpdateMessageDto) {
        try {
            const message = await this.prisma.supportMessage.findUnique({
                where: { id: messageId },
            });

            if (!message || message.ticketId !== ticketId) {
                throw new RpcException('Message not found');
            }

            const updatedMessage = await this.prisma.supportMessage.update({
                where: { id: messageId },
                data: {
                    content: data.content,
                    updatedAt: new Date(),
                },
            });

            this.logger.log(`Message updated: ${messageId}`);
            return updatedMessage;
        } catch (error) {
            this.logger.error(`Failed to update message: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async markMessageAsRead(ticketId: string, messageId: string) {
        try {
            const message = await this.prisma.supportMessage.findUnique({
                where: { id: messageId },
            });

            if (!message || message.ticketId !== ticketId) {
                throw new RpcException('Message not found');
            }

            const updatedMessage = await this.prisma.supportMessage.update({
                where: { id: messageId },
                data: {
                    isRead: true,
                    readAt: new Date(),
                    updatedAt: new Date(),
                },
            });

            this.logger.log(`Message marked as read: ${messageId}`);
            return updatedMessage;
        } catch (error) {
            this.logger.error(`Failed to mark message as read: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async deleteMessage(ticketId: string, messageId: string) {
        try {
            const message = await this.prisma.supportMessage.findUnique({
                where: { id: messageId },
            });

            if (!message || message.ticketId !== ticketId) {
                throw new RpcException('Message not found');
            }

            await this.prisma.supportMessage.delete({
                where: { id: messageId },
            });

            this.logger.log(`Message deleted: ${messageId}`);
            return { success: true, message: 'Message deleted successfully' };
        } catch (error) {
            this.logger.error(`Failed to delete message: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async markAllMessagesAsRead(ticketId: string, senderId?: string) {
        try {
            const ticket = await this.prisma.supportTicket.findUnique({
                where: { id: ticketId },
            });

            if (!ticket) {
                throw new RpcException('Ticket not found');
            }

            const where: any = { ticketId, isRead: false };
            if (senderId) {
                where.OR = [{ senderId }, { agentId: senderId }];
            }

            const result = await this.prisma.supportMessage.updateMany({
                where,
                data: {
                    isRead: true,
                    readAt: new Date(),
                    updatedAt: new Date(),
                },
            });

            this.logger.log(`Marked ${result.count} messages as read`);
            return {
                success: true,
                count: result.count,
                message: `${result.count} messages marked as read`,
            };
        } catch (error) {
            this.logger.error(`Failed to mark all messages as read: ${error.message}`);
            throw new RpcException(error.message);
        }
    }
}
