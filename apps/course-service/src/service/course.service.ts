import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { CreateCourseDto, UpdateCourseDto, CreateCourseRatingDto } from '../dto/course.dto';
import { PrismaService } from '@app/database';

@Injectable()
export class CourseService {
    private readonly logger = new Logger(CourseService.name);
    
    constructor(private readonly prisma: PrismaService) { }

    async createCourse(createCourseDto: CreateCourseDto) {
        try {
            // Validate required fields
            if (!createCourseDto.title) {
                throw new BadRequestException('Course title is required');
            }
            if (!createCourseDto.priceId) {
                throw new BadRequestException('Course price ID is required');
            }

            // Generate slug from title if not provided
            let slug = createCourseDto.slug;
            if (!slug) {
                slug = this.generateSlug(createCourseDto.title);
                
                // Ensure slug is unique
                let uniqueSlug = slug;
                let counter = 1;
                while (await (this.prisma as any).course.findUnique({ where: { slug: uniqueSlug } })) {
                    uniqueSlug = `${slug}-${counter}`;
                    counter++;
                }
                slug = uniqueSlug;
            }



            const course = await (this.prisma as any).course.create({
                data: {
                    title: createCourseDto.title,
                    shortDesc: createCourseDto.shortDesc,
                    description: createCourseDto.description,
                    slug: slug,
                    instructorId: null,
                    priceId: createCourseDto.priceId,
                    categoryId: createCourseDto.categoryId || null,
                    bodyHtml: createCourseDto.bodyHtml,
                    seo: createCourseDto.seo || null,
                    coverImageId: createCourseDto.coverImageId || null,
                    isFeatured: createCourseDto.isFeatured !== undefined 
                        ? (typeof createCourseDto.isFeatured === 'string' 
                            ? createCourseDto.isFeatured === 'true' || createCourseDto.isFeatured === '1'
                            : Boolean(createCourseDto.isFeatured))
                        : true,
                    link: createCourseDto.link || null,
                    status: createCourseDto.status || 'DRAFT',
                    createdBy: createCourseDto.createdBy,
                },
                include: {
                    price: true,
                    category: true,
                    chapters: true,
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
            return course;
        } catch (error) {
            if (error.code === 'P2002') {
                throw new BadRequestException('Course slug already exists');
            }
            if (error.code === 'P2003') {
                throw new BadRequestException('Invalid reference: category, price, or cover image does not exist');
            }
            if (error instanceof BadRequestException) {
                throw error;
            }
            console.error('Course creation error:', error);
            throw new BadRequestException(`Failed to create course: ${error.message || 'Unknown error'}`);
        }
    }

    async getAllCourses(skip: number = 0, take: number = 10, status?: string, isFeatured?: boolean) {
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

        const [courses, total] = await Promise.all([
            (this.prisma as any).course.findMany({
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
                    chapters: {
                        where: { deletedAt: null },
                    },
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
            (this.prisma as any).course.count({ where }),
        ]);

        // Map courses to include coverImageLink
        // API Gateway serves static files from public directory on port 3000
        const baseUrl = process.env.API_GATEWAY_BASE_URL || 'http://localhost:3000';
        
        const mappedCourses = courses.map((course: any) => {
            // Get coverImageLink from coverImage -> filename (coverImage is now Media directly)
            let coverImageLink: string | null = null;
            if (course.coverImage?.filename) {
                coverImageLink = `${baseUrl}/${course.coverImage.filename}`;
            }

            return {
                id: course.id,
                title: course.title,
                shortDesc: course.shortDesc,
                description: course.description,
                thumbnail: course.thumbnail,
                slug: course.slug,
                priceId: course.priceId,
                bodyHtml: course.bodyHtml,
                seo: course.seo,
                status: course.status,
                coverImageLink: coverImageLink,
                link: course.link || null,
                price: course.price,
                category: course.category,
                ratings: course.ratings,
                chapterCount: course.chapterCount || 0,
                lessonCount: course.lessonCount || 0,
                documentCount: course.documentCount || 0,
                viewsCount: course.viewsCount || 0,
                reactionsCount: course.reactionsCount || 0,
                sharesCount: course.sharesCount || 0,
            };
        });

        // Calculate pagination info
        const currentPage = Math.floor(skip / take) + 1;
        const totalPages = Math.ceil(total / take);
        const hasNext = currentPage < totalPages;
        const hasPrev = currentPage > 1;

        return {
            data: mappedCourses,
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

    async getFeaturedCourses(limit: number = 4) {
        const where: any = {
            deletedAt: null,
            isFeatured: true,
            // Không filter theo status để lấy cả DRAFT và PUBLIC
            // Nếu muốn chỉ lấy PUBLIC, có thể thêm: status: 'PUBLIC'
        };

        const courses = await (this.prisma as any).course.findMany({
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

        // Map courses to include coverImageLink
        const baseUrl = process.env.API_GATEWAY_BASE_URL || 'http://localhost:3000';
        
        const mappedCourses = courses.map((course: any) => {
            // Get coverImageLink from coverImage -> filename (coverImage is now Media directly)
            let coverImageLink: string | null = null;
            if (course.coverImage?.filename) {
                coverImageLink = `${baseUrl}/${course.coverImage.filename}`;
            }

            return {
                id: course.id,
                title: course.title,
                shortDesc: course.shortDesc,
                description: course.description,
                thumbnail: course.thumbnail,
                slug: course.slug,
                priceId: course.priceId,
                bodyHtml: course.bodyHtml,
                seo: course.seo,
                status: course.status,
                coverImageLink: coverImageLink,
                link: course.link || null,
                price: course.price,
                category: course.category,
                ratings: course.ratings,
                chapterCount: course.chapterCount || 0,
                lessonCount: course.lessonCount || 0,
                documentCount: course.documentCount || 0,
                viewsCount: course.viewsCount || 0,
                reactionsCount: course.reactionsCount || 0,
                sharesCount: course.sharesCount || 0,
            };
        });

        return {
            data: mappedCourses,
            total: mappedCourses.length,
        };
    }

    async getCourseById(id: string) {
        const course = await (this.prisma as any).course.findFirst({
            where: { 
                id,
                deletedAt: null, // Exclude soft-deleted courses
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
                chapters: {
                    where: { deletedAt: null },
                    include: {
                        lessons: {
                            where: { deletedAt: null },
                            include: {
                                documents: {
                                    where: { deletedAt: null },
                                },
                            },
                        },
                    },
                    orderBy: { position: 'asc' },
                },
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

        if (!course || course.deletedAt) {
            throw new NotFoundException('Course not found');
        }

        return course;
    }

    async getCourseBySlug(slug: string) {
        const course = await (this.prisma as any).course.findFirst({
            where: { 
                slug,
                deletedAt: null, // Exclude soft-deleted courses
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
                chapters: {
                    where: { deletedAt: null },
                    include: {
                        lessons: {
                            where: { deletedAt: null },
                            include: {
                                documents: {
                                    where: { deletedAt: null },
                                },
                            },
                        },
                    },
                    orderBy: { position: 'asc' },
                },
                ratings: {
                    where: { deletedAt: null },
                    select: {
                        rating: true,
                        id: true,
                    },
                },
            },
        });

        if (!course || course.deletedAt) {
            throw new NotFoundException('Course not found');
        }

        return course;
    }

    async updateCourse(id: string, updateCourseDto: UpdateCourseDto) {
        const course = await (this.prisma as any).course.findUnique({ where: { id } });
        if (!course || course.deletedAt) {
            throw new NotFoundException('Course not found');
        }

        try {
            const updateData: any = {
                updatedBy: updateCourseDto.updatedBy,
                updatedAt: new Date(),
            };

            // Only update fields that are provided
            if (updateCourseDto.title !== undefined) {
                updateData.title = updateCourseDto.title;
            }
            if (updateCourseDto.shortDesc !== undefined) {
                updateData.shortDesc = updateCourseDto.shortDesc;
            }
            if (updateCourseDto.description !== undefined) {
                updateData.description = updateCourseDto.description;
            }
            if (updateCourseDto.bodyHtml !== undefined) {
                updateData.bodyHtml = updateCourseDto.bodyHtml;
            }
            if (updateCourseDto.priceId !== undefined) {
                updateData.priceId = updateCourseDto.priceId;
            }
            if (updateCourseDto.categoryId !== undefined) {
                updateData.categoryId = updateCourseDto.categoryId;
            }
            if (updateCourseDto.coverImageId !== undefined) {
                // coverImageId giờ reference trực tiếp đến Media.id
                // Nếu là null hoặc empty string, set về null
                if (updateCourseDto.coverImageId === null || updateCourseDto.coverImageId === '') {
                    updateData.coverImageId = null;
                } else {
                    updateData.coverImageId = updateCourseDto.coverImageId;
                }
            }
            if (updateCourseDto.status !== undefined) {
                updateData.status = updateCourseDto.status;
            }

            // Handle optional fields - seo can be null or object
            // Check if seo is explicitly provided in the request (even if null)
            if (updateCourseDto.hasOwnProperty('seo') || 'seo' in updateCourseDto) {
                updateData.seo = updateCourseDto.seo;
            }

            if (updateCourseDto.isFeatured !== undefined) {
                // Convert string to boolean if needed (form-data sends strings)
                if (typeof updateCourseDto.isFeatured === 'string') {
                    updateData.isFeatured = updateCourseDto.isFeatured === 'true' || updateCourseDto.isFeatured === '1';
                } else {
                    updateData.isFeatured = Boolean(updateCourseDto.isFeatured);
                }
            }

            if (updateCourseDto.link !== undefined) {
                updateData.link = updateCourseDto.link;
            }

            // Allow updating slug if provided
            if (updateCourseDto.slug !== undefined && updateCourseDto.slug !== null && updateCourseDto.slug !== '') {
                // Check if slug already exists for another course
                const existingCourseWithSlug = await (this.prisma as any).course.findFirst({
                    where: {
                        slug: updateCourseDto.slug,
                        id: { not: id },
                        deletedAt: null,
                    },
                });
                if (existingCourseWithSlug) {
                    throw new BadRequestException('Course slug already exists');
                }
                updateData.slug = updateCourseDto.slug;
            }

            const updated = await (this.prisma as any).course.update({
                where: { id },
                data: updateData,
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
                    chapters: true,
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
            if (error.code === 'P2002') {
                throw new BadRequestException('Course slug already exists');
            }
            throw error;
        }
    }

    async deleteCourse(id: string, deletedBy: string) {
        const course = await (this.prisma as any).course.findUnique({ where: { id } });
        if (!course || course.deletedAt) {
            throw new NotFoundException('Course not found');
        }

        return (this.prisma as any).course.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                deletedBy,
            },
        });
    }

    async publishCourse(id: string, updatedBy: string) {
        const course = await (this.prisma as any).course.findUnique({ where: { id } });
        if (!course || course.deletedAt) {
            throw new NotFoundException('Course not found');
        }

        return (this.prisma as any).course.update({
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
            },
        });
    }

    async getCoursesByInstructor(instructorId: string, skip: number = 0, take: number = 10) {
        const [courses, total] = await Promise.all([
            (this.prisma as any).course.findMany({
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
                    chapters: {
                        where: { deletedAt: null },
                    },
                    ratings: {
                        where: { deletedAt: null },
                        select: {
                            rating: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            (this.prisma as any).course.count({
                where: {
                    instructorId,
                    deletedAt: null,
                },
            }),
        ]);

        return {
            data: courses,
            total,
            skip,
            take,
        };
    }

    async incrementCourseView(id: string) {
        const course = await (this.prisma as any).course.findUnique({ where: { id } });
        if (!course || course.deletedAt) {
            throw new NotFoundException('Course not found');
        }

        return (this.prisma as any).course.update({
            where: { id },
            data: {
                viewsCount: {
                    increment: 1,
                },
            },
        });
    }

    async count() {
        return (this.prisma as any).course.count({
            where: { deletedAt: null },
        });
    }

    async markCourseAsUsed(userId: string, courseId: string): Promise<unknown> {
        try {
            // Check if course exists and not deleted
            const course = await (this.prisma as any).course.findFirst({
                where: { 
                    id: courseId,
                    deletedAt: null, // Exclude soft-deleted courses
                },
            });

            if (!course) {
                throw new Error('Course not found');
            }

            // Check if usage record already exists
            const existingUsage = await (this.prisma as any).userCourseUsage.findUnique({
                where: {
                    userId_courseId: {
                        userId,
                        courseId,
                    },
                },
            });

            if (existingUsage) {
                // Update existing record
                return (this.prisma as any).userCourseUsage.update({
                    where: {
                        userId_courseId: {
                            userId,
                            courseId,
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
                return (this.prisma as any).userCourseUsage.create({
                    data: {
                        userId,
                        courseId,
                        createdBy: userId,
                        updatedBy: userId,
                    },
                });
            }
        } catch (error) {
            if (error instanceof Error) {
                throw new BadRequestException(error.message);
            }
            throw new BadRequestException('Failed to mark course as used');
        }
    }

    async toggleSaveCourse(userId: string, courseId: string): Promise<unknown> {
        try {
            // Check if course exists and not deleted
            const course = await (this.prisma as any).course.findFirst({
                where: { 
                    id: courseId,
                    deletedAt: null, // Exclude soft-deleted courses
                },
            });

            if (!course) {
                throw new Error('Course not found');
            }

            // Check if already saved
            const existingSave = await (this.prisma as any).userSavedCourse.findUnique({
                where: {
                    userId_courseId: {
                        userId,
                        courseId,
                    },
                },
            });

            if (existingSave) {
                // Remove from saved
                await (this.prisma as any).userSavedCourse.delete({
                    where: {
                        userId_courseId: {
                            userId,
                            courseId,
                        },
                    },
                });
                return { action: 'unsaved', message: 'Course removed from saved courses' };
            } else {
                // Add to saved
                return (this.prisma as any).userSavedCourse.create({
                    data: {
                        userId,
                        courseId,
                        createdBy: userId,
                        updatedBy: userId,
                    },
                    include: {
                        course: true,
                    },
                });
            }
        } catch (error) {
            if (error instanceof Error) {
                throw new BadRequestException(error.message);
            }
            throw new BadRequestException('Failed to toggle save course');
        }
    }

    async getUserUsedCourses(userId: string, pageNo: number = 0, pageSize: number = 10): Promise<unknown> {
        try {
            const skip = pageNo * pageSize;
            const take = pageSize;

            const usages = await (this.prisma as any).userCourseUsage.findMany({
                where: {
                    userId,
                    course: {
                        deletedAt: null, // Exclude soft-deleted courses
                    },
                },
                orderBy: { lastUsedAt: 'desc' },
                skip,
                take,
                include: {
                    course: {
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

            const total = await (this.prisma as any).userCourseUsage.count({
                where: {
                    userId,
                    course: {
                        deletedAt: null,
                    },
                },
            });

            // Transform courses
            const transformedCourses = usages.map((usage: any) => {
                const { seo, createdAt, updatedAt, createdBy, updatedBy, ...courseData } = usage.course;
                return {
                    ...courseData,
                    price: usage.course.price?.name || null,
                    category: usage.course.category || null,
                    coverImage: usage.course.coverImage || null,
                };
            });

            return {
                courses: transformedCourses,
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
            throw new BadRequestException('Failed to get user used courses');
        }
    }

    async getUserSavedCourses(userId: string, pageNo: number = 0, pageSize: number = 10): Promise<unknown> {
        try {
            const skip = pageNo * pageSize;
            const take = pageSize;

            const saved = await (this.prisma as any).userSavedCourse.findMany({
                where: {
                    userId,
                    course: {
                        deletedAt: null, // Exclude soft-deleted courses
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take,
                include: {
                    course: {
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

            const total = await (this.prisma as any).userSavedCourse.count({
                where: {
                    userId,
                    course: {
                        deletedAt: null,
                    },
                },
            });

            // Transform courses
            const transformedCourses = saved.map((save: any) => {
                const { seo, createdAt, updatedAt, createdBy, updatedBy, ...courseData } = save.course;
                return {
                    ...courseData,
                    price: save.course.price?.name || null,
                    category: save.course.category || null,
                    coverImage: save.course.coverImage || null,
                };
            });

            return {
                courses: transformedCourses,
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
            throw new BadRequestException('Failed to get user saved courses');
        }
    }

    async getCoursesAdmin(query: {
        pageNo?: number;
        pageSize?: number;
        search?: string;
        status?: string;
    }): Promise<{
        courses: any[];
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
                deletedAt: null, // Exclude soft-deleted courses in admin list
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

            const [courses, total] = await Promise.all([
                (this.prisma as any).course.findMany({
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
                (this.prisma as any).course.count({ where }),
            ]);

            // Map courses to include coverImageLink
            const baseUrl = process.env.API_GATEWAY_BASE_URL || 'http://localhost:3000';
            
            const transformedCourses = courses.map((course: any) => {
                let coverImageLink: string | null = null;
                if (course.coverImage?.filename) {
                    coverImageLink = `${baseUrl}/${course.coverImage.filename}`;
                }

                const { deletedAt, deletedBy, ...courseData } = course;
                return {
                    ...courseData,
                    seo: course.seo,
                    createdAt: course.createdAt,
                    updatedAt: course.updatedAt,
                    createdBy: course.createdBy,
                    updatedBy: course.updatedBy,
                    createdByUser: course.createdByUser || null,
                    updatedByUser: course.updatedByUser || null,
                    price: course.price?.name || 'N/A',
                    category: course.category || null,
                    coverImage: course.coverImage || null, // Ensure coverImage is included
                    coverImageLink: coverImageLink,
                    ratingsCount: course._count.ratings,
                    avgRating: course.avgRating && course.ratingsCount > 0 
                        ? Number(course.avgRating) 
                        : 5,
                };
            });

            return {
                courses: transformedCourses,
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
            throw new BadRequestException('Failed to get courses admin');
        }
    }

    async getCourseAdmin(id: string) {
        try {
            if (!id || typeof id !== 'string') {
                throw new BadRequestException('Course ID is required');
            }

            const course = await (this.prisma as any).course.findUnique({
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

            if (!course) {
                throw new NotFoundException('Course not found');
            }

            // Map to include coverImageLink
            const baseUrl = process.env.API_GATEWAY_BASE_URL || 'http://localhost:3000';
            let coverImageLink: string | null = null;
            if (course.coverImage?.filename) {
                coverImageLink = `${baseUrl}/${course.coverImage.filename}`;
            }

            const { deletedAt, deletedBy, ...courseData } = course;
            return {
                ...courseData,
                seo: course.seo,
                createdAt: course.createdAt,
                updatedAt: course.updatedAt,
                createdBy: course.createdBy,
                updatedBy: course.updatedBy,
                createdByUser: course.createdByUser || null,
                updatedByUser: course.updatedByUser || null,
                price: course.price?.name || 'N/A',
                category: course.category || null,
                coverImage: course.coverImage || null, // Ensure coverImage is included
                coverImageLink: coverImageLink,
                ratingsCount: course._count.ratings,
                avgRating: course.avgRating && course.ratingsCount > 0 
                    ? Number(course.avgRating) 
                    : 5,
            };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(`Error getting course admin by ID ${id}: ${error}`);
            throw new BadRequestException(`Failed to get course: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
