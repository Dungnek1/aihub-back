import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from '@app/database';

interface CreateCategoryDto {
    name: string;
    slug?: string;
    description?: string;
    icon?: string;
    order?: number;
}

interface UpdateCategoryDto {
    name?: string;
    slug?: string;
    description?: string;
    icon?: string;
    order?: number;
}

interface ListCategoryQuery {
    page?: number;
    limit?: number;
}

@Injectable()
export class SupportCategoryService {
    private readonly logger = new Logger(SupportCategoryService.name);

    constructor(private readonly prisma: PrismaService) { }

    async createCategory(data: CreateCategoryDto) {
        try {
            // Generate slug from name if not provided
            const slug = data.slug || data.name
                .toLowerCase()
                .trim()
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-');

            const existingCategory = await this.prisma.supportIssueCategory.findFirst({
                where: {
                    OR: [{ name: data.name }, { slug }],
                },
            });

            if (existingCategory) {
                throw new RpcException('Category name or slug already exists');
            }

            const category = await this.prisma.supportIssueCategory.create({
                data: {
                    name: data.name,
                    slug,
                    description: data.description,
                    icon: data.icon,
                    order: data.order || 0,
                    createdAt: new Date(),
                },
            });

            this.logger.log(`Category created: ${category.id}`);
            return category;
        } catch (error) {
            this.logger.error(`Failed to create category: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async getCategories(query: ListCategoryQuery) {
        try {
            const page = query.page || 1;
            const limit = query.limit || 10;
            const skip = (page - 1) * limit;

            const [categories, total] = await Promise.all([
                this.prisma.supportIssueCategory.findMany({
                    skip,
                    take: limit,
                    orderBy: { order: 'asc' },
                }),
                this.prisma.supportIssueCategory.count(),
            ]);

            return {
                data: categories,
                total,
                page,
                limit,
            };
        } catch (error) {
            this.logger.error(`Failed to fetch categories: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async getCategoryById(categoryId: string) {
        try {
            const category = await this.prisma.supportIssueCategory.findUnique({
                where: { id: categoryId },
                include: {
                    tickets: {
                        select: {
                            id: true,
                            ticketNumber: true,
                            status: true,
                            priority: true,
                        },
                    },
                },
            });

            if (!category) {
                throw new RpcException('Category not found');
            }

            return category;
        } catch (error) {
            this.logger.error(`Failed to fetch category: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async updateCategory(categoryId: string, data: UpdateCategoryDto) {
        try {
            const category = await this.prisma.supportIssueCategory.findUnique({
                where: { id: categoryId },
            });

            if (!category) {
                throw new RpcException('Category not found');
            }

            // Check if new slug/name conflicts with other categories
            if (data.slug && data.slug !== category.slug) {
                const existingSlug = await this.prisma.supportIssueCategory.findFirst({
                    where: { slug: data.slug, id: { not: categoryId } },
                });
                if (existingSlug) {
                    throw new RpcException('Slug already exists');
                }
            }

            const updatedCategory = await this.prisma.supportIssueCategory.update({
                where: { id: categoryId },
                data: {
                    ...data,
                    updatedAt: new Date(),
                },
            });

            this.logger.log(`Category updated: ${categoryId}`);
            return updatedCategory;
        } catch (error) {
            this.logger.error(`Failed to update category: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async deleteCategory(categoryId: string) {
        try {
            const category = await this.prisma.supportIssueCategory.findUnique({
                where: { id: categoryId },
                include: { tickets: true },
            });

            if (!category) {
                throw new RpcException('Category not found');
            }

            if (category.tickets.length > 0) {
                throw new RpcException('Cannot delete category with existing tickets');
            }

            await this.prisma.supportIssueCategory.delete({
                where: { id: categoryId },
            });

            this.logger.log(`Category deleted: ${categoryId}`);
            return { success: true, message: 'Category deleted successfully' };
        } catch (error) {
            this.logger.error(`Failed to delete category: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async getCategoryTickets(categoryId: string, query: any) {
        try {
            const category = await this.prisma.supportIssueCategory.findUnique({
                where: { id: categoryId },
            });

            if (!category) {
                throw new RpcException('Category not found');
            }

            const page = query.page || 1;
            const limit = query.limit || 10;
            const skip = (page - 1) * limit;

            const [tickets, total] = await Promise.all([
                this.prisma.supportTicket.findMany({
                    where: {
                        categoryId,
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
                this.prisma.supportTicket.count({
                    where: {
                        categoryId,
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
            this.logger.error(`Failed to fetch category tickets: ${error.message}`);
            throw new RpcException(error.message);
        }
    }
}
