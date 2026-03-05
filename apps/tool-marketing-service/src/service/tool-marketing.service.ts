import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { CreateToolMarketingDto, UpdateToolMarketingDto, CreateToolMarketingRatingDto } from '../dto/tool-marketing.dto';
import { PrismaService } from '@app/database';

@Injectable()
export class ToolMarketingService {
    private readonly logger = new Logger(ToolMarketingService.name);

    constructor(private readonly prisma: PrismaService) { }

    async createToolMarketing(createToolMarketingDto: CreateToolMarketingDto) {
        try {
            // Validate required fields
            if (!createToolMarketingDto.title) {
                throw new BadRequestException('Tool Marketing title is required');
            }
            if (!createToolMarketingDto.priceId) {
                throw new BadRequestException('Tool Marketing price ID is required');
            }

            // Generate slug from title if not provided
            let slug = createToolMarketingDto.slug;
            if (!slug) {
                slug = this.generateSlug(createToolMarketingDto.title);

                // Ensure slug is unique
                let uniqueSlug = slug;
                let counter = 1;
                while (await (this.prisma as any).toolMarketing.findUnique({ where: { slug: uniqueSlug } })) {
                    uniqueSlug = `${slug}-${counter}`;
                    counter++;
                }
                slug = uniqueSlug;
            }

            // let finalCoverAttachmentId: string | undefined = undefined;
            // if (createCourseDto.coverImageId) {
            //     console.log('Processing coverImageId:', createCourseDto.coverImageId);
            //     // Check if this is already an attachment id
            //     const existingAttachment = await this.prisma.statusFeedAttachment.findUnique({
            //         where: { id: createCourseDto.coverImageId },
            //     });
            //     if (existingAttachment) {
            //         console.log('Found existing attachment:', existingAttachment.id);
            //         finalCoverAttachmentId = existingAttachment.id;
            //     } else {
            //         console.log('Not an existing attachment, checking if it\'s a media ID');
            //         // Check if it's a media id
            //         const media = await this.prisma.media.findUnique({ where: { id: createCourseDto.coverImageId } });
            //         if (!media) {
            //             console.log('Media not found for ID:', createCourseDto.coverImageId);
            //             throw new Error(`Cover image not found: ${createCourseDto.coverImageId}`);
            //         }

            //         console.log('Found media:', media.id, 'creating StatusFeed and attachment');

            //         try {
            //             // Ensure a StatusFeed exists for this content (contentId is unique on StatusFeed)
            //             let statusFeed = await this.prisma.statusFeed.findUnique({ where: { contentId: createCourseDto.coverImageId } });
            //             if (!statusFeed) {
            //                 console.log('Creating StatusFeed for content:', createCourseDto.coverImageId);
            //                 statusFeed = await this.prisma.statusFeed.create({
            //                     data: {
            //                         contentId: createCourseDto.coverImageId,
            //                         privacyInt: 1, // public
            //                     },
            //                 });
            //                 console.log('Created StatusFeed:', statusFeed.id);
            //             } else {
            //                 console.log('Found existing StatusFeed:', statusFeed.id);
            //             }

            //             const attachment = await this.prisma.statusFeedAttachment.create({
            //                 data: {
            //                     statusId: statusFeed.id,
            //                     mediaId: media.id,
            //                 },
            //             });

            //             console.log('Created StatusFeedAttachment:', attachment.id);
            //             finalCoverAttachmentId = attachment.id;
            //         } catch (error) {
            //             console.error('Error creating StatusFeedAttachment:', error);
            //             throw new Error('Failed to create cover image attachment');
            //         }
            //     }
            // } else {
            //     console.log('No coverImageId provided');
            // }



            const toolMarketing = await (this.prisma as any).toolMarketing.create({
                data: {
                    title: createToolMarketingDto.title,
                    shortDesc: createToolMarketingDto.shortDesc,
                    description: createToolMarketingDto.description,
                    slug: slug,
                    instructorId: null,
                    priceId: createToolMarketingDto.priceId,
                    categoryId: createToolMarketingDto.categoryId || null,
                    bodyHtml: createToolMarketingDto.bodyHtml,
                    seo: createToolMarketingDto.seo || null,
                    coverImageId: createToolMarketingDto.coverImageId || null,
                    isFeatured: createToolMarketingDto.isFeatured !== undefined
                        ? (typeof createToolMarketingDto.isFeatured === 'string'
                            ? createToolMarketingDto.isFeatured === 'true' || createToolMarketingDto.isFeatured === '1'
                            : Boolean(createToolMarketingDto.isFeatured))
                        : true,
                    link: createToolMarketingDto.link || null,
                    status: createToolMarketingDto.status || 'DRAFT',
                    createdBy: createToolMarketingDto.createdBy,
                },
                include: {
                    price: true,
                    category: true,
                    coverImage: true,
                    ratings: true,
                    createdByUser: {
                        select: {
                            userId: true,
                            username: true,
                            name: true,
                            email: true,
                            avatarUrl: true,
                        },
                    },
                    updatedByUser: {
                        select: {
                            userId: true,
                            username: true,
                            name: true,
                            email: true,
                            avatarUrl: true,
                        },
                    },
                },
            });
            return toolMarketing;
        } catch (error) {
            if (error.code === 'P2002') {
                throw new BadRequestException('Tool Marketing slug already exists');
            }
            if (error.code === 'P2003') {
                throw new BadRequestException('Invalid reference: category, price, or cover image does not exist');
            }
            if (error instanceof BadRequestException) {
                throw error;
            }
            console.error('Tool Marketing creation error:', error);
            throw new BadRequestException(`Failed to create tool marketing: ${error.message || 'Unknown error'}`);
        }
    }

    async getAllToolMarketings(skip: number = 0, take: number = 10, status?: string, isFeatured?: boolean) {
        const where: any = {
            deletedAt: null,
        };

        if (status) {
            where.status = status;
        }

        // Only filter by isFeatured if explicitly provided (not null/undefined)
        // If not provided, return all courses regardless of featured status
        if (isFeatured !== undefined) {
            where.isFeatured = isFeatured;
        }

        const [toolMarketings, total] = await Promise.all([
            (this.prisma as any).toolMarketing.findMany({
                where,
                skip,
                take,
                include: {
                    instructor: {
                        select: {
                            userId: true,
                            username: true,
                            name: true,
                            avatarUrl: true,
                        },
                    },
                    price: true,
                    category: true,
                    coverImage: true,
                    ratings: {
                        where: { deletedAt: null },
                        include: {
                            user: {
                                select: {
                                    userId: true,
                                    username: true,
                                    name: true,
                                    avatarUrl: true,
                                },
                            },
                        },
                        orderBy: { createdAt: 'desc' },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            (this.prisma as any).toolMarketing.count({ where }),
        ]);

        // Map courses to include coverImageLink
        // API Gateway serves static files from public directory on port 3000
        const baseUrl = process.env.API_GATEWAY_BASE_URL || 'http://localhost:3000';

        const mappedToolMarketings = toolMarketings.map((toolMarketing: any) => {
            // Get coverImageLink from coverImage -> filename (coverImage is now Media directly)
            let coverImageLink: string | null = null;
            if (toolMarketing.coverImage?.filename) {
                coverImageLink = `${baseUrl}/${toolMarketing.coverImage.filename}`;
            }

            return {
                id: toolMarketing.id,
                title: toolMarketing.title,
                shortDesc: toolMarketing.shortDesc,
                description: toolMarketing.description,
                thumbnail: toolMarketing.thumbnail,
                slug: toolMarketing.slug,
                priceId: toolMarketing.priceId,
                bodyHtml: toolMarketing.bodyHtml,
                seo: toolMarketing.seo,
                status: toolMarketing.status,
                coverImageLink: coverImageLink,
                link: toolMarketing.link || null,
                price: toolMarketing.price,
                category: toolMarketing.category,
                ratings: toolMarketing.ratings,
                chapterCount: toolMarketing.chapterCount || 0,
                lessonCount: toolMarketing.lessonCount || 0,
                documentCount: toolMarketing.documentCount || 0,
                viewsCount: toolMarketing.viewsCount || 0,
                reactionsCount: toolMarketing.reactionsCount || 0,
                sharesCount: toolMarketing.sharesCount || 0,
            };
        });

        // Calculate pagination info
        const currentPage = Math.floor(skip / take) + 1;
        const totalPages = Math.ceil(total / take);
        const hasNext = currentPage < totalPages;
        const hasPrev = currentPage > 1;

        return {
            data: mappedToolMarketings,
            pagination: {
                currentPage,
                totalPages,
                total,
                limit: take,
                skip,
                hasNext,
                hasPrev,
            },
        };
    }

    async getFeaturedToolMarketings(limit: number = 4) {
        const where: any = {
            deletedAt: null,
            isFeatured: true,
            // Không filter theo status để lấy cả DRAFT và PUBLIC
            // Nếu muốn chỉ lấy PUBLIC, có thể thêm: status: 'PUBLIC'
        };

        const toolMarketings = await (this.prisma as any).toolMarketing.findMany({
            where,
            take: limit,
            orderBy: [
                { avgRating: 'desc' }, // Sắp xếp theo điểm đánh giá cao nhất
                { ratingsCount: 'desc' }, // Sau đó theo số lượng đánh giá
                { viewsCount: 'desc' }, // Cuối cùng theo lượt xem
            ],
            include: {
                instructor: {
                    select: {
                        userId: true,
                        username: true,
                        name: true,
                        avatarUrl: true,
                    },
                },
                price: true,
                category: true,
                coverImage: true,
                ratings: {
                    where: { deletedAt: null },
                    include: {
                        user: {
                            select: {
                                userId: true,
                                username: true,
                                name: true,
                                avatarUrl: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 5, // Chỉ lấy 5 rating gần nhất
                },
            },
        });

        // Map tool marketings to include coverImageLink
        const baseUrl = process.env.API_GATEWAY_BASE_URL || 'http://localhost:3000';

        const mappedToolMarketings = toolMarketings.map((toolMarketing: any) => {
            // Get coverImageLink from coverImage -> filename (coverImage is now Media directly)
            let coverImageLink: string | null = null;
            if (toolMarketing.coverImage?.filename) {
                coverImageLink = `${baseUrl}/${toolMarketing.coverImage.filename}`;
            }

            return {
                id: toolMarketing.id,
                title: toolMarketing.title,
                shortDesc: toolMarketing.shortDesc,
                description: toolMarketing.description,
                thumbnail: toolMarketing.thumbnail,
                slug: toolMarketing.slug,
                priceId: toolMarketing.priceId,
                bodyHtml: toolMarketing.bodyHtml,
                seo: toolMarketing.seo,
                status: toolMarketing.status,
                coverImageLink: coverImageLink,
                link: toolMarketing.link || null,
                price: toolMarketing.price,
                category: toolMarketing.category,
                ratings: toolMarketing.ratings,
                chapterCount: toolMarketing.chapterCount || 0,
                lessonCount: toolMarketing.lessonCount || 0,
                documentCount: toolMarketing.documentCount || 0,
                viewsCount: toolMarketing.viewsCount || 0,
                reactionsCount: toolMarketing.reactionsCount || 0,
                sharesCount: toolMarketing.sharesCount || 0,
            };
        });

        return {
            data: mappedToolMarketings,
            total: mappedToolMarketings.length,
        };
    }

    async getToolMarketingById(id: string) {
        try {
            if (!id || typeof id !== 'string') {
                throw new BadRequestException('Tool Marketing ID is required');
            }

            const toolMarketing = await (this.prisma as any).toolMarketing.findFirst({
                where: {
                    id,
                    deletedAt: null, // Exclude soft-deleted tool marketings
                },
                include: {
                    instructor: {
                        select: {
                            userId: true,
                            username: true,
                            name: true,
                            avatarUrl: true,
                        },
                    },
                    price: true,
                    category: true,
                    coverImage: true,
                    ratings: {
                        where: { deletedAt: null },
                        include: {
                            user: {
                                select: {
                                    userId: true,
                                    username: true,
                                    avatarUrl: true,
                                },
                            },
                        },
                        orderBy: { createdAt: 'desc' },
                    },
                },
            });

            if (!toolMarketing) {
                throw new NotFoundException('Tool Marketing not found');
            }

            return toolMarketing;
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(`Error getting tool marketing by ID ${id}: ${error}`);
            throw new BadRequestException(`Failed to get tool marketing: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async getToolMarketingBySlug(slug: string) {
        const toolMarketing = await (this.prisma as any).toolMarketing.findFirst({
            where: { 
                slug,
                deletedAt: null, // Exclude soft-deleted tool marketings
            },
            include: {
                instructor: {
                    select: {
                        userId: true,
                        username: true,
                        name: true,
                        avatarUrl: true,
                    },
                },
                price: true,
                category: true,
                coverImage: true,
                ratings: {
                    where: { deletedAt: null },
                    select: {
                        rating: true,
                        id: true,
                    },
                },
            },
        });

        if (!toolMarketing || toolMarketing.deletedAt) {
            throw new NotFoundException('Tool Marketing not found');
        }

        return toolMarketing;
    }

    async updateToolMarketing(id: string, updateToolMarketingDto: UpdateToolMarketingDto) {
        const toolMarketing = await (this.prisma as any).toolMarketing.findUnique({ where: { id } });
        if (!toolMarketing || toolMarketing.deletedAt) {
            throw new NotFoundException('Tool Marketing not found');
        }

        // Declare updateData outside try block so it's accessible in catch block
        const updateData: any = {
            updatedBy: updateToolMarketingDto.updatedBy,
            updatedAt: new Date(),
        };

        try {
            // Log incoming data for debugging
            console.log('Update Tool Marketing - Received data:', JSON.stringify(updateToolMarketingDto, null, 2));
            console.log('SEO in updateToolMarketingDto:', updateToolMarketingDto.seo);
            console.log('Has seo property:', 'seo' in updateToolMarketingDto);
            console.log('HasOwnProperty seo:', (updateToolMarketingDto as any).hasOwnProperty?.('seo'));

            // Only update fields that are provided
            if (updateToolMarketingDto.title !== undefined) {
                updateData.title = updateToolMarketingDto.title;
            }
            if (updateToolMarketingDto.shortDesc !== undefined) {
                updateData.shortDesc = updateToolMarketingDto.shortDesc;
            }
            if (updateToolMarketingDto.description !== undefined) {
                updateData.description = updateToolMarketingDto.description;
            }
            if (updateToolMarketingDto.bodyHtml !== undefined) {
                updateData.bodyHtml = updateToolMarketingDto.bodyHtml;
            }
            if (updateToolMarketingDto.priceId !== undefined) {
                updateData.priceId = updateToolMarketingDto.priceId;
            }
            if (updateToolMarketingDto.categoryId !== undefined) {
                updateData.categoryId = updateToolMarketingDto.categoryId;
            }
            if (updateToolMarketingDto.coverImageId !== undefined) {
                // coverImageId giờ reference trực tiếp đến Media.id
                // Nếu là null hoặc empty string, set về null
                if (updateToolMarketingDto.coverImageId === null || updateToolMarketingDto.coverImageId === '') {
                    updateData.coverImageId = null;
                } else {
                    updateData.coverImageId = updateToolMarketingDto.coverImageId;
                }
            }
            if (updateToolMarketingDto.status !== undefined) {
                updateData.status = updateToolMarketingDto.status;
            }

            // Handle optional fields - seo can be null or object
            // Always check if seo exists in the DTO (even if null or empty object)
            const seoValue = (updateToolMarketingDto as any).seo;
            if (seoValue !== undefined) {
                updateData.seo = seoValue;
                console.log('Setting SEO in updateData:', updateData.seo);
            } else {
                console.log('SEO not found in updateToolMarketingDto');
            }

            if (updateToolMarketingDto.isFeatured !== undefined) {
                // Convert string to boolean if needed (form-data sends strings)
                if (typeof updateToolMarketingDto.isFeatured === 'string') {
                    updateData.isFeatured = updateToolMarketingDto.isFeatured === 'true' || updateToolMarketingDto.isFeatured === '1';
                } else {
                    updateData.isFeatured = Boolean(updateToolMarketingDto.isFeatured);
                }
            }

            if (updateToolMarketingDto.link !== undefined) {
                updateData.link = updateToolMarketingDto.link;
            }

            // Allow updating slug if provided
            if (updateToolMarketingDto.slug !== undefined && updateToolMarketingDto.slug !== null && updateToolMarketingDto.slug !== '') {
                // Check if slug already exists for another tool marketing
                const existingToolMarketingWithSlug = await (this.prisma as any).toolMarketing.findFirst({
                    where: {
                        slug: updateToolMarketingDto.slug,
                        id: { not: id },
                        deletedAt: null,
                    },
                });
                if (existingToolMarketingWithSlug) {
                    throw new BadRequestException('Tool Marketing slug already exists');
                }
                updateData.slug = updateToolMarketingDto.slug;
            }

            const updated = await (this.prisma as any).toolMarketing.update({
                where: { id },
                data: updateData,
                include: {
                    price: true,
                    category: true,
                    coverImage: true,
                    ratings: true,
                    createdByUser: {
                        select: {
                            userId: true,
                            username: true,
                            name: true,
                            email: true,
                            avatarUrl: true,
                        },
                    },
                    updatedByUser: {
                        select: {
                            userId: true,
                            username: true,
                            name: true,
                            email: true,
                            avatarUrl: true,
                        },
                    },
                },
            });
            return updated;
        } catch (error) {
            if (error?.code === 'P2002') {
                throw new BadRequestException('Tool Marketing slug already exists');
            }

            // Handle foreign key constraint violations for coverImageId
            if (error?.code === 'P2003' && error?.meta?.field_name === 'tool_marketings_cover_image_id_fkey (index)') {
                const attemptedCoverImageId = updateData.coverImageId;
                this.logger.error(`Media with ID ${attemptedCoverImageId} does not exist.`);
                throw new BadRequestException(`Cover image with ID ${attemptedCoverImageId} does not exist. Please verify the media was uploaded successfully.`);
            }

            throw error;
        }
    }

    async deleteToolMarketing(id: string, deletedBy: string) {
        const toolMarketing = await (this.prisma as any).toolMarketing.findUnique({ where: { id } });
        if (!toolMarketing || toolMarketing.deletedAt) {
            throw new NotFoundException('Tool Marketing not found');
        }

        return (this.prisma as any).toolMarketing.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                deletedBy,
            },
        });
    }

    async publishToolMarketing(id: string, updatedBy: string) {
        const toolMarketing = await (this.prisma as any).toolMarketing.findUnique({ where: { id } });
        if (!toolMarketing || toolMarketing.deletedAt) {
            throw new NotFoundException('Tool Marketing not found');
        }

        return (this.prisma as any).toolMarketing.update({
            where: { id },
            data: {
                status: 'PUBLIC',
                updatedBy,
                updatedAt: new Date(),
            },
            include: {
                instructor: true,
                price: true,
                category: true,
                coverImage: true,
            },
        });
    }

    async getToolMarketingsByInstructor(instructorId: string, skip: number = 0, take: number = 10) {
        const [toolMarketings, total] = await Promise.all([
            (this.prisma as any).toolMarketing.findMany({
                where: {
                    instructorId,
                    deletedAt: null,
                },
                skip,
                take,
                include: {
                    instructor: {
                        select: {
                            userId: true,
                            username: true,
                            name: true,
                            avatarUrl: true,
                        },
                    },
                    price: true,
                    category: true,
                    coverImage: true,
                    ratings: {
                        where: { deletedAt: null },
                        select: {
                            rating: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            (this.prisma as any).toolMarketing.count({
                where: {
                    instructorId,
                    deletedAt: null,
                },
            }),
        ]);

        return {
            data: toolMarketings,
            total,
            skip,
            take,
        };
    }

    async incrementToolMarketingView(id: string) {
        const toolMarketing = await (this.prisma as any).toolMarketing.findUnique({ where: { id } });
        if (!toolMarketing || toolMarketing.deletedAt) {
            throw new NotFoundException('Tool Marketing not found');
        }

        return (this.prisma as any).toolMarketing.update({
            where: { id },
            data: {
                viewsCount: {
                    increment: 1,
                },
            },
        });
    }

    async count() {
        return (this.prisma as any).toolMarketing.count({
            where: { deletedAt: null },
        });
    }

    async markToolMarketingAsUsed(userId: string, toolMarketingId: string): Promise<unknown> {
        try {
            // Check if tool marketing exists and not deleted
            const toolMarketing = await (this.prisma as any).toolMarketing.findFirst({
                where: { 
                    id: toolMarketingId,
                    deletedAt: null, // Exclude soft-deleted tool marketings
                },
            });

            if (!toolMarketing) {
                throw new Error('Tool marketing not found');
            }

            // Check if usage record already exists
            const existingUsage = await (this.prisma as any).userToolMarketingUsage.findUnique({
                where: {
                    userId_toolMarketingId: {
                        userId,
                        toolMarketingId,
                    },
                },
            });

            if (existingUsage) {
                // Update existing record
                return (this.prisma as any).userToolMarketingUsage.update({
                    where: {
                        userId_toolMarketingId: {
                            userId,
                            toolMarketingId,
                        },
                    },
                    data: {
                        lastUsedAt: new Date(),
                        usageCount: { increment: 1 },
                        updatedBy: userId,
                    },
                });
            } else {
                // Create new record
                return (this.prisma as any).userToolMarketingUsage.create({
                    data: {
                        userId,
                        toolMarketingId,
                        createdBy: userId,
                        updatedBy: userId,
                    },
                });
            }
        } catch (error) {
            if (error instanceof Error) {
                throw new BadRequestException(error.message);
            }
            throw new BadRequestException('Failed to mark tool marketing as used');
        }
    }

    async toggleSaveToolMarketing(userId: string, toolMarketingId: string): Promise<unknown> {
        try {
            // Check if tool marketing exists and not deleted
            const toolMarketing = await (this.prisma as any).toolMarketing.findFirst({
                where: { 
                    id: toolMarketingId,
                    deletedAt: null, // Exclude soft-deleted tool marketings
                },
            });

            if (!toolMarketing) {
                throw new Error('Tool marketing not found');
            }

            // Check if already saved
            const existingSave = await (this.prisma as any).userSavedToolMarketing.findUnique({
                where: {
                    userId_toolMarketingId: {
                        userId,
                        toolMarketingId,
                    },
                },
            });

            if (existingSave) {
                // Remove from saved
                await (this.prisma as any).userSavedToolMarketing.delete({
                    where: {
                        userId_toolMarketingId: {
                            userId,
                            toolMarketingId,
                        },
                    },
                });
                return { action: 'unsaved', message: 'Tool marketing removed from saved tool marketings' };
            } else {
                // Add to saved
                return (this.prisma as any).userSavedToolMarketing.create({
                    data: {
                        userId,
                        toolMarketingId,
                        createdBy: userId,
                        updatedBy: userId,
                    },
                    include: {
                        toolMarketing: true,
                    },
                });
            }
        } catch (error) {
            if (error instanceof Error) {
                throw new BadRequestException(error.message);
            }
            throw new BadRequestException('Failed to toggle save tool marketing');
        }
    }

    async getUserUsedToolMarketings(userId: string, pageNo: number = 0, pageSize: number = 10): Promise<unknown> {
        try {
            const skip = pageNo * pageSize;
            const take = pageSize;

            const usages = await (this.prisma as any).userToolMarketingUsage.findMany({
                where: {
                    userId,
                    toolMarketing: {
                        deletedAt: null, // Exclude soft-deleted tool marketings
                    },
                },
                orderBy: { lastUsedAt: 'desc' },
                skip,
                take,
                include: {
                    toolMarketing: {
                        include: {
                            instructor: {
                                select: {
                                    userId: true,
                                    username: true,
                                    name: true,
                                    avatarUrl: true,
                                },
                            },
                            price: true,
                            category: true,
                            coverImage: true,
                        },
                    },
                },
            });

            const total = await (this.prisma as any).userToolMarketingUsage.count({
                where: {
                    userId,
                    toolMarketing: {
                        deletedAt: null,
                    },
                },
            });

            // Transform tool marketings
            const transformedToolMarketings = usages.map((usage: any) => {
                const { seo, createdAt, updatedAt, createdBy, updatedBy, ...toolMarketingData } = usage.toolMarketing;
                return {
                    ...toolMarketingData,
                    price: usage.toolMarketing.price?.name || null,
                    category: usage.toolMarketing.category || null,
                    coverImage: usage.toolMarketing.coverImage || null,
                };
            });

            return {
                toolMarketings: transformedToolMarketings,
                pagination: {
                    pageNo,
                    pageSize,
                    total,
                    totalPages: Math.ceil(total / pageSize),
                },
            };
        } catch (error) {
            if (error instanceof Error) {
                throw new BadRequestException(error.message);
            }
            throw new BadRequestException('Failed to get user used tool marketings');
        }
    }

    async getUserSavedToolMarketings(userId: string, pageNo: number = 0, pageSize: number = 10): Promise<unknown> {
        try {
            // Validate userId
            if (!userId || typeof userId !== 'string') {
                throw new BadRequestException('User ID is required');
            }

            // Validate and sanitize pagination parameters
            const validPageNo = Math.max(0, Math.floor(Number(pageNo) || 0));
            const validPageSize = Math.max(1, Math.min(100, Math.floor(Number(pageSize) || 10))); // Max 100 items per page

            const skip = validPageNo * validPageSize;
            const take = validPageSize;

            const saved = await (this.prisma as any).userSavedToolMarketing.findMany({
                where: {
                    userId,
                    toolMarketing: {
                        deletedAt: null, // Exclude soft-deleted tool marketings
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take,
                include: {
                    toolMarketing: {
                        include: {
                            instructor: {
                                select: {
                                    userId: true,
                                    username: true,
                                    name: true,
                                    avatarUrl: true,
                                },
                            },
                            price: true,
                            category: true,
                            coverImage: true,
                        },
                    },
                },
            }).catch((error: any) => {
                this.logger.error(`Error querying saved tool marketings for user ${userId}: ${error.message}`);
                this.logger.error(`Error stack: ${error.stack}`);
                throw new BadRequestException(`Failed to query saved tool marketings: ${error.message}`);
            });

            const total = await (this.prisma as any).userSavedToolMarketing.count({
                where: {
                    userId,
                    toolMarketing: {
                        deletedAt: null,
                    },
                },
            });

            // Transform tool marketings - filter out any null or deleted tool marketings
            const transformedToolMarketings = saved
                .filter((save: any) => save.toolMarketing && !save.toolMarketing.deletedAt)
                .map((save: any) => {
                    try {
                        const { seo, createdAt, updatedAt, createdBy, updatedBy, deletedAt, deletedBy, ...toolMarketingData } = save.toolMarketing;
                        let coverImageLink: string | null = null;
                        if (save.toolMarketing.coverImage?.filename) {
                            const baseUrl = process.env.API_GATEWAY_BASE_URL || 'http://localhost:3000';
                            coverImageLink = `${baseUrl}/${save.toolMarketing.coverImage.filename}`;
                        }
                        return {
                            ...toolMarketingData,
                            price: save.toolMarketing.price?.name || null,
                            category: save.toolMarketing.category || null,
                            coverImage: save.toolMarketing.coverImage || null,
                            coverImageLink: coverImageLink,
                        };
                    } catch (mapError) {
                        this.logger.warn(`Error mapping tool marketing ${save.toolMarketing?.id}: ${mapError}`);
                        return null;
                    }
                })
                .filter((item: any) => item !== null); // Remove any null items from mapping errors

            return {
                toolMarketings: transformedToolMarketings,
                pagination: {
                    pageNo: validPageNo,
                    pageSize: validPageSize,
                    total,
                    totalPages: Math.ceil(total / validPageSize),
                },
            };
        } catch (error) {
            console.error('Error in getUserSavedToolMarketings:', error);
            if (error instanceof Error) {
                console.error('Error message:', error.message);
                console.error('Error stack:', error.stack);
                throw new BadRequestException(`Failed to get user saved tool marketings: ${error.message}`);
            }
            throw new BadRequestException('Failed to get user saved tool marketings');
        }
    }

    async getToolMarketingsAdmin(query: {
        pageNo?: number;
        pageSize?: number;
        search?: string;
        status?: string;
    }): Promise<{
        toolMarketings: any[];
        pagination: {
            pageNo: number;
            pageSize: number;
            total: number;
            totalPages: number;
        };
    }> {
        try {
            const pageNo = query.pageNo || 0;
            const pageSize = query.pageSize || 20;
            const { search, status } = query;

            const where: any = {
                deletedAt: null, // Exclude soft-deleted tool marketings in admin list
            };

            if (search) {
                where.OR = [
                    { title: { contains: search, mode: 'insensitive' } },
                    { shortDesc: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                    { slug: { contains: search, mode: 'insensitive' } },
                ];
            }

            if (status) {
                where.status = status;
            }

            const [toolMarketings, total] = await Promise.all([
                (this.prisma as any).toolMarketing.findMany({
                    where,
                    include: {
                        price: true,
                        category: true,
                        coverImage: true,
                        createdByUser: {
                            select: {
                                userId: true,
                                username: true,
                                name: true,
                                email: true,
                                avatarUrl: true,
                            },
                        },
                        updatedByUser: {
                            select: {
                                userId: true,
                                username: true,
                                name: true,
                                email: true,
                                avatarUrl: true,
                            },
                        },
                        _count: {
                            select: { ratings: true },
                        },
                    },
                    skip: pageNo * pageSize,
                    take: pageSize,
                    orderBy: { createdAt: 'desc' },
                }),
                (this.prisma as any).toolMarketing.count({ where }),
            ]);

            // Map tool marketings to include coverImageLink
            const baseUrl = process.env.API_GATEWAY_BASE_URL || 'http://localhost:3000';

            const transformedToolMarketings = toolMarketings.map((toolMarketing: any) => {
                let coverImageLink: string | null = null;
                if (toolMarketing.coverImage?.filename) {
                    coverImageLink = `${baseUrl}/${toolMarketing.coverImage.filename}`;
                }

                const { deletedAt, deletedBy, ...toolMarketingData } = toolMarketing;
                return {
                    ...toolMarketingData,
                    seo: toolMarketing.seo,
                    createdAt: toolMarketing.createdAt,
                    updatedAt: toolMarketing.updatedAt,
                    createdBy: toolMarketing.createdBy,
                    updatedBy: toolMarketing.updatedBy,
                    createdByUser: toolMarketing.createdByUser || null,
                    updatedByUser: toolMarketing.updatedByUser || null,
                    price: toolMarketing.price?.name || 'N/A',
                    category: toolMarketing.category || null,
                    coverImage: toolMarketing.coverImage || null, // Ensure coverImage is included
                    coverImageLink: coverImageLink,
                    ratingsCount: toolMarketing._count.ratings,
                    avgRating: toolMarketing.avgRating && toolMarketing.ratingsCount > 0
                        ? Number(toolMarketing.avgRating)
                        : 5,
                };
            });

            return {
                toolMarketings: transformedToolMarketings,
                pagination: {
                    pageNo,
                    pageSize,
                    total,
                    totalPages: Math.ceil(total / pageSize),
                },
            };
        } catch (error) {
            if (error instanceof Error) {
                throw new BadRequestException(error.message);
            }
            throw new BadRequestException('Failed to get tool marketings admin');
        }
    }

    async getToolMarketingAdmin(id: string) {
        try {
            if (!id || typeof id !== 'string') {
                throw new BadRequestException('Tool Marketing ID is required');
            }

            const toolMarketing = await (this.prisma as any).toolMarketing.findUnique({
                where: { id },
                include: {
                    price: true,
                    category: true,
                    coverImage: true,
                    createdByUser: {
                        select: {
                            userId: true,
                            username: true,
                            name: true,
                            email: true,
                            avatarUrl: true,
                        },
                    },
                    updatedByUser: {
                        select: {
                            userId: true,
                            username: true,
                            name: true,
                            email: true,
                            avatarUrl: true,
                        },
                    },
                    _count: {
                        select: { ratings: true },
                    },
                },
            });

            if (!toolMarketing) {
                throw new NotFoundException('Tool Marketing not found');
            }

            // Map to include coverImageLink
            const baseUrl = process.env.API_GATEWAY_BASE_URL || 'http://localhost:3000';
            let coverImageLink: string | null = null;
            if (toolMarketing.coverImage?.filename) {
                coverImageLink = `${baseUrl}/${toolMarketing.coverImage.filename}`;
            }

            const { deletedAt, deletedBy, ...toolMarketingData } = toolMarketing;
            return {
                ...toolMarketingData,
                seo: toolMarketing.seo,
                createdAt: toolMarketing.createdAt,
                updatedAt: toolMarketing.updatedAt,
                createdBy: toolMarketing.createdBy,
                updatedBy: toolMarketing.updatedBy,
                createdByUser: toolMarketing.createdByUser || null,
                updatedByUser: toolMarketing.updatedByUser || null,
                price: toolMarketing.price?.name || 'N/A',
                category: toolMarketing.category || null,
                coverImage: toolMarketing.coverImage || null, // Ensure coverImage is included
                coverImageLink: coverImageLink,
                ratingsCount: toolMarketing._count.ratings,
                avgRating: toolMarketing.avgRating && toolMarketing.ratingsCount > 0
                    ? Number(toolMarketing.avgRating)
                    : 5,
            };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(`Error getting tool marketing admin by ID ${id}: ${error}`);
            throw new BadRequestException(`Failed to get tool marketing: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private generateSlug(title: string): string {
        return title
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }
}
