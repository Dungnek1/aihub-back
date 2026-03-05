import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { RpcException } from '@nestjs/microservices';

interface CreateNewsletterSubscriptionDto {
    email: string;
    source?: 'HOME' | 'LANDING_PAGE';
}

@Injectable()
export class NewsletterSubscriptionService {
    private readonly logger = new Logger(NewsletterSubscriptionService.name);

    constructor(private readonly prisma: PrismaService) { }

    async createSubscription(data: CreateNewsletterSubscriptionDto) {
        try {
            this.logger.log(`Creating newsletter subscription for email: ${data.email}`);

            // Check if email already exists and is not deleted
            const existing = await this.prisma.newsletterSubscription.findUnique({
                where: { email: data.email },
            });

            if (existing && !existing.deletedAt) {
                // If exists and not deleted, update source if different
                if (existing.source !== data.source) {
                    const updated = await this.prisma.newsletterSubscription.update({
                        where: { id: existing.id },
                        data: {
                            source: data.source || 'HOME',
                            deletedAt: null, // Restore if was soft-deleted
                        },
                    });
                    this.logger.log(`Newsletter subscription updated for email: ${data.email}`);
                    return updated;
                }
                // Already subscribed with same source
                return existing;
            }

            // Create new subscription or restore deleted one
            const subscription = await this.prisma.newsletterSubscription.upsert({
                where: { email: data.email },
                update: {
                    source: data.source || 'HOME',
                    deletedAt: null, // Restore if was soft-deleted
                },
                create: {
                    email: data.email,
                    source: data.source || 'HOME',
                },
            });

            this.logger.log(`Newsletter subscription created/updated with ID: ${subscription.id}`);
            return subscription;
        } catch (error) {
            this.logger.error(`Failed to create newsletter subscription: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async getSubscriptions(skip = 0, take = 10) {
        try {
            this.logger.log(`Fetching newsletter subscriptions - skip: ${skip}, take: ${take}`);

            const [subscriptions, total] = await Promise.all([
                this.prisma.newsletterSubscription.findMany({
                    where: { deletedAt: null },
                    skip,
                    take,
                    orderBy: { createdAt: 'desc' },
                }),
                this.prisma.newsletterSubscription.count({ where: { deletedAt: null } }),
            ]);

            return {
                data: subscriptions,
                total,
                skip,
                take,
            };
        } catch (error) {
            this.logger.error(`Failed to fetch newsletter subscriptions: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async getSubscriptionsAdmin(query: {
        pageNo?: number;
        pageSize?: number;
        source?: string;
        search?: string;
    }) {
        try {
            const pageNo = query.pageNo || 0;
            const pageSize = query.pageSize || 20;
            const { source, search } = query;

            const where: any = {
                deletedAt: null,
            };

            if (source) {
                where.source = source;
            }

            if (search) {
                where.email = {
                    contains: search,
                    mode: 'insensitive',
                };
            }

            this.logger.log(`Fetching newsletter subscriptions admin - pageNo: ${pageNo}, pageSize: ${pageSize}, source: ${source}, search: ${search}`);

            const [subscriptions, total] = await Promise.all([
                this.prisma.newsletterSubscription.findMany({
                    where,
                    skip: pageNo * pageSize,
                    take: pageSize,
                    orderBy: { createdAt: 'desc' },
                }),
                this.prisma.newsletterSubscription.count({ where }),
            ]);

            return {
                subscriptions,
                pagination: {
                    pageNo,
                    pageSize,
                    total,
                    totalPages: Math.ceil(total / pageSize),
                },
            };
        } catch (error) {
            this.logger.error(`Failed to fetch newsletter subscriptions admin: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async getSubscriptionById(id: string) {
        try {
            this.logger.log(`Fetching newsletter subscription: ${id}`);

            const subscription = await this.prisma.newsletterSubscription.findUnique({
                where: { id },
            });

            if (!subscription || subscription.deletedAt !== null) {
                throw new Error(`Newsletter subscription with ID ${id} not found`);
            }

            return subscription;
        } catch (error) {
            this.logger.error(`Failed to fetch newsletter subscription: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async deleteSubscription(id: string) {
        try {
            this.logger.log(`Deleting newsletter subscription: ${id}`);

            const subscription = await this.prisma.newsletterSubscription.update({
                where: { id },
                data: {
                    deletedAt: new Date(),
                },
            });

            this.logger.log(`Newsletter subscription ${id} soft deleted`);
            return subscription;
        } catch (error) {
            this.logger.error(`Failed to delete newsletter subscription: ${error.message}`);
            throw new RpcException(error.message);
        }
    }
}

