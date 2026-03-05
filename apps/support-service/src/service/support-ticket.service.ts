import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from '@app/database';
import {
    SupportChannel,
    SupportTicketPriority,
    SupportTicketStatus,
} from '@prisma/client';

interface CreateTicketDto {
    userId: string;
    categoryId: string;
    channel?: SupportChannel;
    subject: string;
    description?: string;
    priority?: SupportTicketPriority;
    tags?: string[];
    attachments?: string[];
    createBy?: string;
}

interface UpdateTicketDto {
    subject?: string;
    description?: string;
    tags?: string[];
}

interface ListTicketQuery {
    page?: number;
    limit?: number;
    userId?: string;
    status?: SupportTicketStatus;
    priority?: SupportTicketPriority;
    channel?: SupportChannel;
    categoryId?: string;
    agentId?: string;
    sortBy?: string;
    sortOrder?: string;
}

@Injectable()
export class SupportTicketService {
    private readonly logger = new Logger(SupportTicketService.name);

    constructor(private readonly prisma: PrismaService) { }

    async createTicket(data: CreateTicketDto) {
        try {
            // Check if category exists
            const category = await this.prisma.supportIssueCategory.findUnique({
                where: { id: data.categoryId },
            });

            if (!category) {
                throw new RpcException('Category not found');
            }

            // Generate ticket number
            const ticketCount = await this.prisma.supportTicket.count();
            const ticketNumber = `TKT-${new Date().getFullYear()}-${String(ticketCount + 1).padStart(6, '0')}`;

            const ticket = await this.prisma.supportTicket.create({
                data: {
                    userId: data.userId,
                    categoryId: data.categoryId,
                    channel: data.channel || SupportChannel.WEB_SUPPORT,
                    title: data.subject,
                    description: data.description,
                    priority: data.priority || SupportTicketPriority.MEDIUM,
                    ticketNumber,
                    tags: data.tags || [],
                    attachments: data.attachments || [],
                    status: SupportTicketStatus.OPEN,
                    aiResolved: false,
                    createdBy: data.createBy,
                },
            });

            // Log ticket creation activity
            await this.prisma.supportActivityLog.create({
                data: {
                    ticketId: ticket.id,
                    action: 'ticket_created',
                    newValue: SupportTicketStatus.OPEN,
                    details: {
                        subject: data.subject,
                        priority: data.priority || SupportTicketPriority.MEDIUM,
                        channel: data.channel || SupportChannel.WEB_SUPPORT,
                        categoryId: data.categoryId,
                        timestamp: new Date().toISOString(),
                    },
                    createdBy: data.createBy,
                },
            });

            this.logger.log(`Ticket created: ${ticket.id} - ${ticketNumber}`);
            return ticket;
        } catch (error) {
            this.logger.error(`Failed to create ticket: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async getTickets(query: ListTicketQuery) {
        try {
            const page = query.page || 1;
            const limit = query.limit || 10;
            const skip = (page - 1) * limit;

            const where: any = {};
            if (query.userId) where.userId = query.userId;
            if (query.status) where.status = query.status;
            if (query.priority) where.priority = query.priority;
            if (query.channel) where.channel = query.channel;
            if (query.categoryId) where.categoryId = query.categoryId;
            if (query.agentId) where.agentId = query.agentId;

            const sortBy = query.sortBy || 'createdAt';
            const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

            const [tickets, total] = await Promise.all([
                this.prisma.supportTicket.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { [sortBy]: sortOrder },
                    include: {
                        user: {
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
                        category: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                }),
                this.prisma.supportTicket.count({ where }),
            ]);

            return {
                data: tickets,
                total,
                page,
                limit,
            };
        } catch (error) {
            this.logger.error(`Failed to fetch tickets: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async getTicketById(ticketId: string) {
        try {
            const ticket = await this.prisma.supportTicket.findUnique({
                where: { id: ticketId },
                include: {
                    user: {
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
                            status: true,
                        },
                    },
                    category: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    messages: {
                        select: {
                            id: true,
                            senderId: true,
                            senderType: true,
                            content: true,
                            isInternal: true,
                            isRead: true,
                            attachments: true,
                            createdAt: true,
                        },
                        orderBy: { createdAt: 'asc' },
                    },
                    rating: true,
                    activityLogs: {
                        orderBy: { createdAt: 'desc' },
                        take: 20,
                    },
                },
            });

            if (!ticket) {
                throw new RpcException('Ticket not found');
            }

            return ticket;
        } catch (error) {
            this.logger.error(`Failed to fetch ticket: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async updateTicket(ticketId: string, data: UpdateTicketDto) {
        try {
            const ticket = await this.prisma.supportTicket.findUnique({
                where: { id: ticketId },
            });

            if (!ticket) {
                throw new RpcException('Ticket not found');
            }

            // Map subject to title for Prisma
            const updateData: any = { ...data };
            if (data.subject !== undefined) {
                updateData.title = data.subject;
                delete updateData.subject;
            }

            const updatedTicket = await this.prisma.supportTicket.update({
                where: { id: ticketId },
                data: {
                    ...updateData,
                    updatedAt: new Date(),
                },
            });

            this.logger.log(`Ticket updated: ${ticketId}`);
            return updatedTicket;
        } catch (error) {
            this.logger.error(`Failed to update ticket: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async updateTicketStatus(ticketId: string, status: SupportTicketStatus) {
        try {
            const ticket = await this.prisma.supportTicket.findUnique({
                where: { id: ticketId },
            });

            if (!ticket) {
                throw new RpcException('Ticket not found');
            }

            const updatedTicket = await this.prisma.supportTicket.update({
                where: { id: ticketId },
                data: {
                    status,
                    updatedAt: new Date(),
                    resolvedAt: status === SupportTicketStatus.RESOLVED ? new Date() : undefined,
                    closedAt: status === SupportTicketStatus.CLOSED ? new Date() : undefined,
                    firstResponseAt:
                        status === SupportTicketStatus.IN_PROGRESS && !ticket.firstResponseAt
                            ? new Date()
                            : undefined,
                },
            });

            // Log activity
            await this.prisma.supportActivityLog.create({
                data: {
                    ticketId,
                    action: 'status_changed',
                    oldValue: ticket.status,
                    newValue: status,
                    details: {
                        timestamp: new Date().toISOString(),
                    },
                },
            });

            this.logger.log(`Ticket status updated: ${ticketId} -> ${status}`);
            return updatedTicket;
        } catch (error) {
            this.logger.error(`Failed to update ticket status: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async updateTicketPriority(ticketId: string, priority: SupportTicketPriority) {
        try {
            const ticket = await this.prisma.supportTicket.findUnique({
                where: { id: ticketId },
            });

            if (!ticket) {
                throw new RpcException('Ticket not found');
            }

            const updatedTicket = await this.prisma.supportTicket.update({
                where: { id: ticketId },
                data: {
                    priority,
                    updatedAt: new Date(),
                },
            });

            // Log activity
            await this.prisma.supportActivityLog.create({
                data: {
                    ticketId,
                    action: 'priority_changed',
                    oldValue: ticket.priority,
                    newValue: priority,
                },
            });

            this.logger.log(`Ticket priority updated: ${ticketId} -> ${priority}`);
            return updatedTicket;
        } catch (error) {
            this.logger.error(`Failed to update ticket priority: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async assignTicket(ticketId: string, agentId: string) {
        try {
            const [ticket, agent] = await Promise.all([
                this.prisma.supportTicket.findUnique({ where: { id: ticketId } }),
                this.prisma.supportAgent.findUnique({ where: { id: agentId } }),
            ]);

            if (!ticket) throw new RpcException('Ticket not found');
            if (!agent) throw new RpcException('Agent not found');

            // Check if agent has capacity
            if (agent.currentLoad >= agent.maxTickets) {
                throw new RpcException(
                    `Agent has reached maximum ticket capacity (${agent.maxTickets})`,
                );
            }

            const updatedTicket = await this.prisma.supportTicket.update({
                where: { id: ticketId },
                data: {
                    agentId,
                    status: 'ASSIGNED',
                    updatedAt: new Date(),
                },
            });

            // Update agent load
            await this.prisma.supportAgent.update({
                where: { id: agentId },
                data: { currentLoad: agent.currentLoad + 1 },
            });

            // Log activity
            await this.prisma.supportActivityLog.create({
                data: {
                    ticketId,
                    action: 'assigned',
                    newValue: agentId,
                    details: { agentName: agent.name },
                },
            });

            this.logger.log(`Ticket assigned: ${ticketId} -> Agent ${agentId}`);
            return updatedTicket;
        } catch (error) {
            this.logger.error(`Failed to assign ticket: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async unassignTicket(ticketId: string) {
        try {
            const ticket = await this.prisma.supportTicket.findUnique({
                where: { id: ticketId },
            });

            if (!ticket) throw new RpcException('Ticket not found');
            if (!ticket.agentId) throw new RpcException('Ticket not assigned to any agent');

            const updatedTicket = await this.prisma.supportTicket.update({
                where: { id: ticketId },
                data: {
                    agentId: null,
                    status: 'OPEN',
                    updatedAt: new Date(),
                },
            });

            // Update agent load
            await this.prisma.supportAgent.update({
                where: { id: ticket.agentId },
                data: { currentLoad: { decrement: 1 } },
            });

            // Log activity
            await this.prisma.supportActivityLog.create({
                data: {
                    ticketId,
                    action: 'unassigned',
                    oldValue: ticket.agentId,
                },
            });

            this.logger.log(`Ticket unassigned: ${ticketId}`);
            return updatedTicket;
        } catch (error) {
            this.logger.error(`Failed to unassign ticket: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async closeTicket(ticketId: string) {
        try {
            const ticket = await this.prisma.supportTicket.findUnique({
                where: { id: ticketId },
            });

            if (!ticket) throw new RpcException('Ticket not found');

            const updatedTicket = await this.prisma.supportTicket.update({
                where: { id: ticketId },
                data: {
                    status: SupportTicketStatus.CLOSED,
                    closedAt: new Date(),
                    updatedAt: new Date(),
                },
            });

            // Decrement agent load if assigned
            if (ticket.agentId) {
                await this.prisma.supportAgent.update({
                    where: { id: ticket.agentId },
                    data: { currentLoad: { decrement: 1 } },
                });
            }

            // Log activity
            await this.prisma.supportActivityLog.create({
                data: {
                    ticketId,
                    action: 'closed',
                },
            });

            this.logger.log(`Ticket closed: ${ticketId}`);
            return updatedTicket;
        } catch (error) {
            this.logger.error(`Failed to close ticket: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async reopenTicket(ticketId: string) {
        try {
            const ticket = await this.prisma.supportTicket.findUnique({
                where: { id: ticketId },
            });

            if (!ticket) throw new RpcException('Ticket not found');

            const updatedTicket = await this.prisma.supportTicket.update({
                where: { id: ticketId },
                data: {
                    status: SupportTicketStatus.REOPENED,
                    updatedAt: new Date(),
                },
            });

            // Log activity
            await this.prisma.supportActivityLog.create({
                data: {
                    ticketId,
                    action: 'reopened',
                },
            });

            this.logger.log(`Ticket reopened: ${ticketId}`);
            return updatedTicket;
        } catch (error) {
            this.logger.error(`Failed to reopen ticket: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async deleteTicket(ticketId: string) {
        try {
            const ticket = await this.prisma.supportTicket.findUnique({
                where: { id: ticketId },
            });

            if (!ticket) throw new RpcException('Ticket not found');

            // Delete related data
            await Promise.all([
                this.prisma.supportMessage.deleteMany({ where: { ticketId } }),
                this.prisma.supportRating.deleteMany({ where: { ticketId } }),
                this.prisma.supportActivityLog.deleteMany({ where: { ticketId } }),
            ]);

            // Decrement agent load if assigned
            if (ticket.agentId) {
                await this.prisma.supportAgent.update({
                    where: { id: ticket.agentId },
                    data: { currentLoad: { decrement: 1 } },
                });
            }

            await this.prisma.supportTicket.delete({
                where: { id: ticketId },
            });

            this.logger.log(`Ticket deleted: ${ticketId}`);
            return { success: true, message: 'Ticket deleted successfully' };
        } catch (error) {
            this.logger.error(`Failed to delete ticket: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async getTicketAnalytics(query: any) {
        try {
            const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const endDate = query.endDate ? new Date(query.endDate) : new Date();

            const [total, open, assigned, in_progress, waiting_customer, waiting_agent, resolved, closed, reopened] = await Promise.all([
                this.prisma.supportTicket.count({
                    where: { createdAt: { gte: startDate, lte: endDate } },
                }),
                this.prisma.supportTicket.count({
                    where: { status: SupportTicketStatus.OPEN, createdAt: { gte: startDate, lte: endDate } },
                }),
                this.prisma.supportTicket.count({
                    where: { status: SupportTicketStatus.ASSIGNED, createdAt: { gte: startDate, lte: endDate } },
                }),
                this.prisma.supportTicket.count({
                    where: { status: SupportTicketStatus.IN_PROGRESS, createdAt: { gte: startDate, lte: endDate } },
                }),
                this.prisma.supportTicket.count({
                    where: { status: SupportTicketStatus.WAITING_CUSTOMER, createdAt: { gte: startDate, lte: endDate } },
                }),
                this.prisma.supportTicket.count({
                    where: { status: SupportTicketStatus.WAITING_AGENT, createdAt: { gte: startDate, lte: endDate } },
                }),
                this.prisma.supportTicket.count({
                    where: { status: SupportTicketStatus.RESOLVED, createdAt: { gte: startDate, lte: endDate } },
                }),
                this.prisma.supportTicket.count({
                    where: { status: SupportTicketStatus.CLOSED, createdAt: { gte: startDate, lte: endDate } },
                }),
                this.prisma.supportTicket.count({
                    where: { status: SupportTicketStatus.REOPENED, createdAt: { gte: startDate, lte: endDate } },
                }),
            ]);

            return {
                total,
                open,
                assigned,
                in_progress,
                waiting_customer,
                waiting_agent,
                resolved,
                closed,
                reopened,
                startDate,
                endDate,
            };
        } catch (error) {
            this.logger.error(`Failed to fetch ticket analytics: ${error.message}`);
            throw new RpcException(error.message);
        }
    }
}
