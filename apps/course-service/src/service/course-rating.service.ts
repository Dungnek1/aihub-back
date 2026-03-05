import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';

import { CreateCourseRatingDto } from '../dto/course.dto';
import { PrismaService } from '@app/database';

@Injectable()
export class CourseRatingService {
    constructor(private prisma: PrismaService) { }

    async createRating(courseId: string, userId: string, createRatingDto: CreateCourseRatingDto, createdBy: string) {
        // Check if course exists
        const course = await (this.prisma as any).course.findUnique({ 
            where: { id: courseId },
            select: {
                id: true,
                title: true,
                avgRating: true,
                ratingsCount: true,
                instructorId: true,
            },
        });
        if (!course || course.deletedAt) {
            throw new NotFoundException('Course not found');
        }

        // Check if user already rated this course (one rating per user per course)
        const existingRating = await (this.prisma as any).courseRating.findUnique({
            where: {
                courseId_userId: {
                    courseId,
                    userId,
                },
            },
        });

        if (existingRating && !existingRating.deletedAt) {
            throw new BadRequestException('User has already rated this course');
        }

        // If soft deleted rating exists, restore it
        if (existingRating && existingRating.deletedAt) {
            const oldRating = existingRating.rating;
            const rating = await (this.prisma as any).courseRating.update({
                where: { id: existingRating.id },
                data: {
                    rating: createRatingDto.rating,
                    feedback: createRatingDto.feedback,
                    comment: createRatingDto.comment,
                    contentQuality: createRatingDto.contentQuality,
                    instructorQuality: createRatingDto.instructorQuality,
                    learningOutcome: createRatingDto.learningOutcome,
                    materialsQuality: createRatingDto.materialsQuality,
                    deletedAt: null,
                    deletedBy: null,
                    updatedAt: new Date(),
                    updatedBy: createdBy,
                },
                include: {
                    user: {
                        select: {
                            userId: true,
                            username: true,
                            avatarUrl: true,
                        },
                    },
                    course: {
                        select: {
                            id: true,
                            title: true,
                            slug: true,
                        },
                    },
                },
            });

            // Update course avgRating and ratingsCount
            const currentAvgRating = Number(course.avgRating || 0);
            const currentRatingsCount = course.ratingsCount;
            const newAvgRating = ((currentAvgRating * currentRatingsCount) - oldRating + createRatingDto.rating) / currentRatingsCount;

            await (this.prisma as any).course.update({
                where: { id: courseId },
                data: {
                    avgRating: newAvgRating,
                    updatedAt: new Date(),
                },
            });

            return {
                ...rating,
                avgRating: Number(newAvgRating.toFixed(2)),
                ratingsCount: currentRatingsCount,
            };
        }

        // Create new rating
        const rating = await (this.prisma as any).courseRating.create({
            data: {
                courseId,
                userId,
                rating: createRatingDto.rating,
                feedback: createRatingDto.feedback,
                comment: createRatingDto.comment,
                contentQuality: createRatingDto.contentQuality,
                instructorQuality: createRatingDto.instructorQuality,
                learningOutcome: createRatingDto.learningOutcome,
                materialsQuality: createRatingDto.materialsQuality,
                createdBy,
            },
            include: {
                user: {
                    select: {
                        userId: true,
                        username: true,
                        avatarUrl: true,
                    },
                },
                course: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                    },
                },
            },
        });

        // Update course avgRating and ratingsCount (giống tool-service)
        const currentAvgRating = Number(course.avgRating || 0);
        const currentRatingsCount = course.ratingsCount;
        const newRatingsCount = currentRatingsCount + 1;
        const newAvgRating = ((currentAvgRating * currentRatingsCount) + createRatingDto.rating) / newRatingsCount;

        const updatedCourse = await (this.prisma as any).course.update({
            where: { id: courseId },
            data: {
                avgRating: newAvgRating,
                ratingsCount: newRatingsCount,
                updatedAt: new Date(),
            },
        });

        return {
            rating,
            avgRating: Number(newAvgRating.toFixed(2)),
            ratingsCount: updatedCourse.ratingsCount,
        };
    }

    async updateRating(ratingId: string, userId: string, createRatingDto: CreateCourseRatingDto, updatedBy: string) {
        const rating = await (this.prisma as any).courseRating.findUnique({ 
            where: { id: ratingId },
            include: {
                course: {
                    select: {
                        id: true,
                        avgRating: true,
                        ratingsCount: true,
                    },
                },
            },
        });
        if (!rating || rating.deletedAt) {
            throw new NotFoundException('Rating not found');
        }

        if (rating.userId !== userId) {
            throw new BadRequestException('You can only update your own ratings');
        }

        const oldRating = rating.rating;
        const updatedRating = await (this.prisma as any).courseRating.update({
            where: { id: ratingId },
            data: {
                rating: createRatingDto.rating,
                feedback: createRatingDto.feedback,
                comment: createRatingDto.comment,
                contentQuality: createRatingDto.contentQuality,
                instructorQuality: createRatingDto.instructorQuality,
                learningOutcome: createRatingDto.learningOutcome,
                materialsQuality: createRatingDto.materialsQuality,
                updatedAt: new Date(),
                updatedBy,
            },
            include: {
                user: {
                    select: {
                        userId: true,
                        username: true,
                        avatarUrl: true,
                    },
                },
                course: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                    },
                },
            },
        });

        // Update course avgRating (giống tool-service)
        const course = rating.course;
        const currentAvgRating = Number(course.avgRating || 0);
        const currentRatingsCount = course.ratingsCount;
        const newAvgRating = ((currentAvgRating * currentRatingsCount) - oldRating + createRatingDto.rating) / currentRatingsCount;

        await (this.prisma as any).course.update({
            where: { id: course.id },
            data: {
                avgRating: newAvgRating,
                updatedAt: new Date(),
            },
        });

        return {
            ...updatedRating,
            avgRating: Number(newAvgRating.toFixed(2)),
            ratingsCount: currentRatingsCount,
        };
    }

    async deleteRating(ratingId: string, userId: string, deletedBy: string) {
        const rating = await (this.prisma as any).courseRating.findUnique({ 
            where: { id: ratingId },
            include: {
                course: {
                    select: {
                        id: true,
                        avgRating: true,
                        ratingsCount: true,
                    },
                },
            },
        });
        if (!rating || rating.deletedAt) {
            throw new NotFoundException('Rating not found');
        }

        if (rating.userId !== userId) {
            throw new BadRequestException('You can only delete your own ratings');
        }

        // Soft delete rating
        await (this.prisma as any).courseRating.update({
            where: { id: ratingId },
            data: {
                deletedAt: new Date(),
                deletedBy,
            },
        });

        // Update course avgRating and ratingsCount (giống tool-service)
        const course = rating.course;
        const currentAvgRating = Number(course.avgRating || 0);
        const currentRatingsCount = course.ratingsCount;
        
        if (currentRatingsCount > 1) {
            const newRatingsCount = currentRatingsCount - 1;
            const newAvgRating = ((currentAvgRating * currentRatingsCount) - rating.rating) / newRatingsCount;
            
            await (this.prisma as any).course.update({
                where: { id: course.id },
                data: {
                    avgRating: newAvgRating,
                    ratingsCount: newRatingsCount,
                    updatedAt: new Date(),
                },
            });
        } else {
            // If this is the last rating, reset to 0
            await (this.prisma as any).course.update({
                where: { id: course.id },
                data: {
                    avgRating: 0,
                    ratingsCount: 0,
                    updatedAt: new Date(),
                },
            });
        }

        return { success: true };
    }

    async getCourseRatings(courseId: string, skip: number = 0, take: number = 10) {
        const course = await (this.prisma as any).course.findUnique({ where: { id: courseId } });
        if (!course || course.deletedAt) {
            throw new NotFoundException('Course not found');
        }

        const [ratings, total] = await Promise.all([
            (this.prisma as any).courseRating.findMany({
                where: {
                    courseId,
                    deletedAt: null,
                },
                skip,
                take,
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
            }),
            (this.prisma as any).courseRating.count({
                where: {
                    courseId,
                    deletedAt: null,
                },
            }),
        ]);

        return {
            data: ratings,
            total,
            skip,
            take,
        };
    }

    async getAverageRating(courseId: string) {
        const ratings = await (this.prisma as any).courseRating.findMany({
            where: {
                courseId,
                deletedAt: null,
            },
            select: {
                rating: true,
                contentQuality: true,
                instructorQuality: true,
                learningOutcome: true,
                materialsQuality: true,
            },
        });

        if (ratings.length === 0) {
            return {
                averageRating: 0,
                totalRatings: 0,
                averageContentQuality: 0,
                averageInstructorQuality: 0,
                averageLearningOutcome: 0,
                averageMaterialsQuality: 0,
            };
        }

        const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
        const avgContentQuality =
            ratings.reduce((sum, r) => sum + (r.contentQuality || 0), 0) / ratings.length;
        const avgInstructorQuality =
            ratings.reduce((sum, r) => sum + (r.instructorQuality || 0), 0) / ratings.length;
        const avgLearningOutcome =
            ratings.reduce((sum, r) => sum + (r.learningOutcome || 0), 0) / ratings.length;
        const avgMaterialsQuality =
            ratings.reduce((sum, r) => sum + (r.materialsQuality || 0), 0) / ratings.length;

        return {
            averageRating: Math.round(avgRating * 10) / 10,
            totalRatings: ratings.length,
            averageContentQuality: Math.round(avgContentQuality * 10) / 10,
            averageInstructorQuality: Math.round(avgInstructorQuality * 10) / 10,
            averageLearningOutcome: Math.round(avgLearningOutcome * 10) / 10,
            averageMaterialsQuality: Math.round(avgMaterialsQuality * 10) / 10,
        };
    }
}
