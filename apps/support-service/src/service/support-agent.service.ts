import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService, SupportAgentStatus } from '@app/database';

interface CreateAgentDto {
    userId: string;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
    bio?: string;
    maxTickets?: number;
}

interface UpdateAgentDto {
    name?: string;
    phone?: string;
    avatar?: string;
    bio?: string;
    maxTickets?: number;
}

interface ListAgentQuery {
    page?: number;
    limit?: number;
    status?: string;
    isActive?: boolean;
}

@Injectable()
export class SupportAgentService {
    private readonly logger = new Logger(SupportAgentService.name);

    constructor(private readonly prisma: PrismaService) { }

    async createAgent(data: CreateAgentDto) {
        try {
            // Check if user already has agent account
            const existingAgent = await this.prisma.supportAgent.findUnique({
                where: { userId: data.userId },
            });

            if (existingAgent) {
                throw new RpcException('User already has an agent account');
            }

            // Check if email already exists
            const emailExists = await this.prisma.supportAgent.findUnique({
                where: { email: data.email },
            });

            if (emailExists) {
                throw new RpcException('Email already registered');
            }

            const agent = await this.prisma.supportAgent.create({
                data: {
                    userId: data.userId,
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                    avatar: data.avatar,
                    bio: data.bio,
                    maxTickets: data.maxTickets || 5,
                    status: SupportAgentStatus.OFFLINE,
                    isActive: true,
                    createdAt: new Date(),
                },
            });

            this.logger.log(`Agent created: ${agent.id}`);
            return agent;
        } catch (error) {
            this.logger.error(`Failed to create agent: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async getAgents(query: ListAgentQuery) {
        try {
            const page = query.page || 1;
            const limit = query.limit || 10;
            const skip = (page - 1) * limit;

            const where: any = {};
            if (query.status) where.status = query.status;
            if (query.isActive !== undefined) where.isActive = query.isActive;

            const [agents, total] = await Promise.all([
                this.prisma.supportAgent.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        assignedTickets: {
                            select: {
                                id: true,
                                ticketNumber: true,
                                status: true,
                            },
                        },
                    },
                }),
                this.prisma.supportAgent.count({ where }),
            ]);

            return {
                data: agents,
                total,
                page,
                limit,
            };
        } catch (error) {
            this.logger.error(`Failed to fetch agents: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async getAgentById(agentId: string) {
        try {
            const agent = await this.prisma.supportAgent.findUnique({
                where: { id: agentId },
                include: {
                    assignedTickets: {
                        select: {
                            id: true,
                            ticketNumber: true,
                            status: true,
                            priority: true,
                            title: true,
                        },
                        take: 10,
                    },
                    messages: {
                        select: {
                            id: true,
                            content: true,
                            createdAt: true,
                        },
                        take: 5,
                        orderBy: { createdAt: 'desc' },
                    },
                    ratings: {
                        select: {
                            rating: true,
                            responseTimeRating: true,
                            resolutionRating: true,
                            communicationRating: true,
                        },
                        take: 10,
                    },
                },
            });

            if (!agent) {
                throw new RpcException('Agent not found');
            }

            return agent;
        } catch (error) {
            this.logger.error(`Failed to fetch agent: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async updateAgent(agentId: string, data: UpdateAgentDto) {
        try {
            const agent = await this.prisma.supportAgent.findUnique({
                where: { id: agentId },
            });

            if (!agent) {
                throw new RpcException('Agent not found');
            }

            const updatedAgent = await this.prisma.supportAgent.update({
                where: { id: agentId },
                data: {
                    ...data,
                    updatedAt: new Date(),
                },
            });

            this.logger.log(`Agent updated: ${agentId}`);
            return updatedAgent;
        } catch (error) {
            this.logger.error(`Failed to update agent: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async updateAgentStatus(agentId: string, status: SupportAgentStatus) {
        try {
            const agent = await this.prisma.supportAgent.findUnique({
                where: { id: agentId },
            });

            if (!agent) {
                throw new RpcException('Agent not found');
            }

            const updatedAgent = await this.prisma.supportAgent.update({
                where: { id: agentId },
                data: {
                    status,
                    updatedAt: new Date(),
                },
            });

            this.logger.log(`Agent status updated: ${agentId} -> ${status}`);
            return updatedAgent;
        } catch (error) {
            this.logger.error(`Failed to update agent status: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async activateAgent(agentId: string, isActive: boolean) {
        try {
            const agent = await this.prisma.supportAgent.findUnique({
                where: { id: agentId },
            });

            if (!agent) {
                throw new RpcException('Agent not found');
            }

            const updatedAgent = await this.prisma.supportAgent.update({
                where: { id: agentId },
                data: {
                    isActive,
                    updatedAt: new Date(),
                },
            });

            this.logger.log(`Agent activation status: ${agentId} -> ${isActive}`);
            return updatedAgent;
        } catch (error) {
            this.logger.error(`Failed to activate/deactivate agent: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async deleteAgent(agentId: string) {
        try {
            const agent = await this.prisma.supportAgent.findUnique({
                where: { id: agentId },
                include: { assignedTickets: true },
            });

            if (!agent) {
                throw new RpcException('Agent not found');
            }

            if (agent.assignedTickets.length > 0) {
                throw new RpcException('Cannot delete agent with assigned tickets');
            }

            await this.prisma.supportAgent.delete({
                where: { id: agentId },
            });

            this.logger.log(`Agent deleted: ${agentId}`);
            return { success: true, message: 'Agent deleted successfully' };
        } catch (error) {
            this.logger.error(`Failed to delete agent: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async getAgentTickets(agentId: string, query: any) {
        try {
            const agent = await this.prisma.supportAgent.findUnique({
                where: { id: agentId },
            });

            if (!agent) {
                throw new RpcException('Agent not found');
            }

            const page = query.page || 1;
            const limit = query.limit || 10;
            const skip = (page - 1) * limit;

            const [tickets, total] = await Promise.all([
                this.prisma.supportTicket.findMany({
                    where: {
                        agentId,
                        ...(query.status && { status: query.status }),
                    },
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        user: {
                            select: {
                                userId: true,
                                username: true,
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
                this.prisma.supportTicket.count({
                    where: {
                        agentId,
                        ...(query.status && { status: query.status }),
                    },
                }),
            ]);

            return {
                data: tickets,
                total,
                page,
                limit,
            };
        } catch (error) {
            this.logger.error(`Failed to fetch agent tickets: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async getAgentStats(agentId: string) {
        try {
            const agent = await this.prisma.supportAgent.findUnique({
                where: { id: agentId },
            });

            if (!agent) {
                throw new RpcException('Agent not found');
            }

            const [totalTickets, resolvedTickets, ratings] = await Promise.all([
                this.prisma.supportTicket.count({ where: { agentId } }),
                this.prisma.supportTicket.count({
                    where: { agentId, status: 'RESOLVED' },
                }),
                this.prisma.supportRating.findMany({
                    where: { agentId },
                    select: {
                        rating: true,
                        responseTimeRating: true,
                        resolutionRating: true,
                        communicationRating: true,
                    },
                }),
            ]);

            const avgRating =
                ratings.length > 0
                    ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
                    : 0;

            const avgResponseTimeRating =
                ratings.length > 0
                    ? ratings.reduce((sum, r) => sum + (r.responseTimeRating || 0), 0) /
                    ratings.length
                    : 0;

            const avgResolutionRating =
                ratings.length > 0
                    ? ratings.reduce((sum, r) => sum + (r.resolutionRating || 0), 0) /
                    ratings.length
                    : 0;

            const avgCommunicationRating =
                ratings.length > 0
                    ? ratings.reduce((sum, r) => sum + (r.communicationRating || 0), 0) /
                    ratings.length
                    : 0;

            return {
                totalTickets,
                resolvedTickets,
                avgRating: parseFloat(avgRating.toFixed(2)),
                avgResponseTimeRating: parseFloat(avgResponseTimeRating.toFixed(2)),
                avgResolutionRating: parseFloat(avgResolutionRating.toFixed(2)),
                avgCommunicationRating: parseFloat(avgCommunicationRating.toFixed(2)),
                currentLoad: agent.currentLoad,
                maxTickets: agent.maxTickets,
            };
        } catch (error) {
            this.logger.error(`Failed to fetch agent stats: ${error.message}`);
            throw new RpcException(error.message);
        }
    }
}
