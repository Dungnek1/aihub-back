import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from '@app/database';

interface CreateRatingDto {
    ticketId: string;
    userId: string;
    agentId?: string;
    rating: number;
    responseTimeRating?: number;
    resolutionRating?: number;
    communicationRating?: number;
    feedback?: string;
    comment?: string;
}

interface UpdateRatingDto {
    rating?: number;
    responseTimeRating?: number;
    resolutionRating?: number;
    communicationRating?: number;
    feedback?: string;
    comment?: string;
}

interface ListRatingQuery {
    page?: number;
    limit?: number;
}

@Injectable()
export class SupportRatingService {
    private readonly logger = new Logger(SupportRatingService.name);

    constructor(private readonly prisma: PrismaService) { }

    async createRating(data: CreateRatingDto) {
        try {
            // Verify ticket exists
            const ticket = await this.prisma.supportTicket.findUnique({
                where: { id: data.ticketId },
            });

            if (!ticket) {
                throw new RpcException('Ticket not found');
            }

            // Check if rating already exists for this ticket
            const existingRating = await this.prisma.supportRating.findUnique({
                where: { ticketId: data.ticketId },
            });

            if (existingRating) {
                throw new RpcException('Rating already exists for this ticket');
            }

            // Validate rating values (1-5)
            if (data.rating < 1 || data.rating > 5) {
                throw new RpcException('Rating must be between 1 and 5');
            }

            const rating = await this.prisma.supportRating.create({
                data: {
                    ticketId: data.ticketId,
                    userId: data.userId,
                    agentId: data.agentId,
                    rating: data.rating,
                    responseTimeRating: data.responseTimeRating,
                    resolutionRating: data.resolutionRating,
                    communicationRating: data.communicationRating,
                    feedback: data.feedback,
                    comment: data.comment,
                    createdAt: new Date(),
                },
            });

            this.logger.log(`Rating created: ${rating.id}`);
            return rating;
        } catch (error) {
            this.logger.error(`Failed to create rating: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async getRatingByTicket(ticketId: string) {
        try {
            const ticket = await this.prisma.supportTicket.findUnique({
                where: { id: ticketId },
            });

            if (!ticket) {
                throw new RpcException('Ticket not found');
            }

            const rating = await this.prisma.supportRating.findUnique({
                where: { ticketId },
                include: {
                    user: {
                        select: {
                            userId: true,
                            username: true,
                            email: true,
                        },
                    },
                    agent: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    ticket: {
                        select: {
                            id: true,
                            ticketNumber: true,
                            title: true,
                        },
                    },
                },
            });

            if (!rating) {
                return null;
            }

            return rating;
        } catch (error) {
            this.logger.error(`Failed to fetch rating: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async updateRating(ticketId: string, data: UpdateRatingDto) {
        try {
            const rating = await this.prisma.supportRating.findUnique({
                where: { ticketId },
            });

            if (!rating) {
                throw new RpcException('Rating not found');
            }

            // Validate rating if provided
            if (data.rating && (data.rating < 1 || data.rating > 5)) {
                throw new RpcException('Rating must be between 1 and 5');
            }

            const updatedRating = await this.prisma.supportRating.update({
                where: { ticketId },
                data: {
                    ...data,
                    updatedAt: new Date(),
                },
            });

            this.logger.log(`Rating updated: ${ticketId}`);
            return updatedRating;
        } catch (error) {
            this.logger.error(`Failed to update rating: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async deleteRating(ticketId: string) {
        try {
            const rating = await this.prisma.supportRating.findUnique({
                where: { ticketId },
            });

            if (!rating) {
                throw new RpcException('Rating not found');
            }

            await this.prisma.supportRating.delete({
                where: { ticketId },
            });

            this.logger.log(`Rating deleted: ${ticketId}`);
            return { success: true, message: 'Rating deleted successfully' };
        } catch (error) {
            this.logger.error(`Failed to delete rating: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async getAgentRatings(agentId: string, query: ListRatingQuery) {
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

            const [ratings, total] = await Promise.all([
                this.prisma.supportRating.findMany({
                    where: { agentId },
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        user: {
                            select: {
                                userId: true,
                                username: true,
                            },
                        },
                        ticket: {
                            select: {
                                id: true,
                                ticketNumber: true,
                                title: true,
                            },
                        },
                    },
                }),
                this.prisma.supportRating.count({ where: { agentId } }),
            ]);

            return {
                data: ratings,
                total,
                page,
                limit,
            };
        } catch (error) {
            this.logger.error(`Failed to fetch agent ratings: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async getAgentRatingStats(agentId: string) {
        try {
            const agent = await this.prisma.supportAgent.findUnique({
                where: { id: agentId },
            });

            if (!agent) {
                throw new RpcException('Agent not found');
            }

            const ratings = await this.prisma.supportRating.findMany({
                where: { agentId },
                select: {
                    rating: true,
                    responseTimeRating: true,
                    resolutionRating: true,
                    communicationRating: true,
                },
            });

            if (ratings.length === 0) {
                return {
                    averageRating: 0,
                    totalRatings: 0,
                    averageResponseTimeRating: 0,
                    averageResolutionRating: 0,
                    averageCommunicationRating: 0,
                    ratingDistribution: {
                        5: 0,
                        4: 0,
                        3: 0,
                        2: 0,
                        1: 0,
                    },
                };
            }

            const averageRating =
                ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

            const averageResponseTimeRating =
                ratings.reduce((sum, r) => sum + (r.responseTimeRating || 0), 0) /
                ratings.length;

            const averageResolutionRating =
                ratings.reduce((sum, r) => sum + (r.resolutionRating || 0), 0) /
                ratings.length;

            const averageCommunicationRating =
                ratings.reduce((sum, r) => sum + (r.communicationRating || 0), 0) /
                ratings.length;

            const ratingDistribution = {
                5: ratings.filter((r) => r.rating === 5).length,
                4: ratings.filter((r) => r.rating === 4).length,
                3: ratings.filter((r) => r.rating === 3).length,
                2: ratings.filter((r) => r.rating === 2).length,
                1: ratings.filter((r) => r.rating === 1).length,
            };

            return {
                averageRating: parseFloat(averageRating.toFixed(2)),
                totalRatings: ratings.length,
                averageResponseTimeRating: parseFloat(
                    averageResponseTimeRating.toFixed(2),
                ),
                averageResolutionRating: parseFloat(averageResolutionRating.toFixed(2)),
                averageCommunicationRating: parseFloat(
                    averageCommunicationRating.toFixed(2),
                ),
                ratingDistribution,
            };
        } catch (error) {
            this.logger.error(`Failed to fetch agent rating stats: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async getSystemRatingStats(query: any) {
        try {
            const startDate = query.startDate
                ? new Date(query.startDate)
                : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const endDate = query.endDate ? new Date(query.endDate) : new Date();

            const ratings = await this.prisma.supportRating.findMany({
                where: {
                    createdAt: { gte: startDate, lte: endDate },
                },
                select: {
                    rating: true,
                    responseTimeRating: true,
                    resolutionRating: true,
                    communicationRating: true,
                },
            });

            if (ratings.length === 0) {
                return {
                    averageRating: 0,
                    totalRatings: 0,
                    averageResponseTimeRating: 0,
                    averageResolutionRating: 0,
                    averageCommunicationRating: 0,
                };
            }

            const averageRating =
                ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

            const averageResponseTimeRating =
                ratings.reduce((sum, r) => sum + (r.responseTimeRating || 0), 0) /
                ratings.length;

            const averageResolutionRating =
                ratings.reduce((sum, r) => sum + (r.resolutionRating || 0), 0) /
                ratings.length;

            const averageCommunicationRating =
                ratings.reduce((sum, r) => sum + (r.communicationRating || 0), 0) /
                ratings.length;

            return {
                averageRating: parseFloat(averageRating.toFixed(2)),
                totalRatings: ratings.length,
                averageResponseTimeRating: parseFloat(
                    averageResponseTimeRating.toFixed(2),
                ),
                averageResolutionRating: parseFloat(averageResolutionRating.toFixed(2)),
                averageCommunicationRating: parseFloat(
                    averageCommunicationRating.toFixed(2),
                ),
                startDate,
                endDate,
            };
        } catch (error) {
            this.logger.error(`Failed to fetch system rating stats: ${error.message}`);
            throw new RpcException(error.message);
        }
    }
}
