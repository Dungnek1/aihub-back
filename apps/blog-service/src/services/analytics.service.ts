import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { PostAnalyticsResponseDto, MultiPostAnalyticsResponseDto } from '../dtos/analytics.dto';
import { ReactionType } from '@prisma/client';

@Injectable()
export class AnalyticsService {
    constructor(private prisma: PrismaService) { }

    /**
     * Parse datetime string (YYYY-MM-DD HH:mm:ss.MS) to Date object
     * Input: "2025-11-13 08:39:39.81" -> Output: Local Date object
     * FE MUST provide full datetime with time, backend does NOT auto-convert 00:00 or 23:59
     */
    private parseDateTime(dateStr?: string): Date {
        if (!dateStr) {
            // Default to epoch if no date provided
            return new Date(0);
        }

        // Format: YYYY-MM-DD HH:mm:ss.MS
        // Split by space: ["2025-11-13", "08:39:39.81"]
        const [datePart, timePart] = dateStr.split(' ');

        if (!datePart || !timePart) {
            // Fallback: try to parse as ISO or timestamp
            return new Date(dateStr);
        }

        const [year, month, day] = datePart.split('-');
        const [timeWithMs] = timePart.split('.');
        const [hours, minutes, seconds] = timeWithMs.split(':');
        const milliseconds = timePart.includes('.')
            ? parseInt(timePart.split('.')[1].padEnd(3, '0').substring(0, 3))
            : 0;

        const date = new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            parseInt(hours),
            parseInt(minutes),
            parseInt(seconds),
            milliseconds
        );

        console.log(`⏰ Parsed datetime: "${dateStr}" -> ${date.toISOString()}`);
        return date;
    }


    async getPostAnalytics(
        post: any,
        startDate?: string,
        endDate?: string,
        type?: string
    ): Promise<PostAnalyticsResponseDto> {
        // Parse datetime strings to Date objects (required by Prisma)
        const start = this.parseDateTime(startDate);
        const end = this.parseDateTime(endDate);


        let postData: any;
        if (typeof post === 'string') {

            postData = await this.prisma.post.findFirst({
                where: {
                    status: 'PUBLISHED',
                    id: post,
                },
                include: {
                    content: true,
                },
            });
            if (!postData) {
                throw new Error(`Post with ID ${post} not found`);
            }
        } else {

            postData = post;

        }


        const totalComments = await this.prisma.comment.count({
            where: {
                refId: postData.id,
                targetType: 'POST',
                deletedAt: null,
                createdAt: {
                    gte: start,
                    lte: end,
                },
            },
        });


        // Count and breakdown reactions
        const reactions = await this.prisma.reaction.findMany({
            where: {
                refId: postData.contentId,
                targetType: 'POST',
                deletedAt: null,
                createdAt: {
                    gte: start,
                    lte: end,
                },
            },
        });



        const reactionBreakdown = {
            like: 0,
            love: 0,
            haha: 0,
            wow: 0,
            sad: 0,
            angry: 0,
            thuongthuong: 0,
        };

        reactions.forEach((reaction) => {
            const type = reaction.reactionType.toLowerCase();
            if (type in reactionBreakdown) {
                reactionBreakdown[type]++;
            }
        });



        const totalReactions = reactions.length;

        // Count shares
        const totalShares = await this.prisma.share.count({
            where: {
                refId: postData.contentId,
                createdAt: {
                    gte: start,
                    lte: end,
                },
            },
        });

        // Get total views from content table
        const content = await this.prisma.content.findUnique({
            where: {
                id: postData.contentId,
            },
            select: {
                viewsCount: true,
            },
        });

        const totalViews = content?.viewsCount || 0;


        // Calculate engagement rate
        const totalEngagement = totalComments + totalReactions + totalShares;
        const engagementRate = totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0;

        return {
            postId: postData.id,
            title: postData.title,
            totalComments,
            totalReactions,
            totalShares,
            totalViews,
            reactionBreakdown,
            period: {
                startDate: startDate || '',
                endDate: endDate || '',
            },
            engagementRate: Math.round(engagementRate * 100) / 100,
        };
    }

    /**
     * Get analytics for multiple posts
     */
    async getMultiPostAnalytics(
        startDate?: string,
        endDate?: string,
        limit: number = 20,
        offset: number = 0,
    ): Promise<MultiPostAnalyticsResponseDto> {
        const start = this.parseDateTime(startDate);
        const end = this.parseDateTime(endDate);


        const posts = await this.prisma.post.findMany({
            where: {
                status: 'PUBLISHED',
            },
            skip: offset,
            take: limit,
            include: {
                content: true,
            },
        });

        const totalPosts = await this.prisma.post.count({
            where: {
                status: 'PUBLISHED',
            },
        });


        const analyticsPromises = posts.map((post) =>
            this.getPostAnalytics(post, startDate, endDate),
        );

        const data = await Promise.all(analyticsPromises);

        return {
            data,
            total: totalPosts,
            period: {
                startDate: startDate || '',
                endDate: endDate || '',
            },
        };
    }

    /**
     * Get top posts by engagement in a date range
     */
    async getTopPostsByEngagement(
        startDate?: string,
        endDate?: string,
        limit: number = 10,
    ): Promise<PostAnalyticsResponseDto[]> {
        const start = this.parseDateTime(startDate);
        const end = this.parseDateTime(endDate);



        // Get all published posts
        const posts = await this.prisma.post.findMany({
            where: {
                status: 'PUBLISHED',
            },
            include: {
                content: true,
            },
        });

        // Get analytics for each post and sort by engagement
        const analyticsPromises = posts.map((post) =>
            this.getPostAnalytics(post, startDate, endDate),
        );

        const allAnalytics = await Promise.all(analyticsPromises);

        // Sort by total engagement and return top N
        return allAnalytics
            .sort(
                (a, b) =>
                    b.totalComments +
                    b.totalReactions +
                    b.totalShares -
                    (a.totalComments + a.totalReactions + a.totalShares),
            )
            .slice(0, limit);
    }

    /**
     * Get analytics trend for a post (daily breakdown)
     */
    async getPostAnalyticsTrend(
        postId: string,
        startDate?: string,
        endDate?: string,
    ) {
        const post = await this.prisma.post.findUnique({
            where: { id: postId },
        });

        if (!post) {
            throw new Error(`Post with ID ${postId} not found`);
        }

        const start = this.parseDateTime(startDate);
        const end = this.parseDateTime(endDate);

        const contentId = post.contentId;

        // Get daily breakdown of comments
        const commentsByDay = await this.prisma.comment.groupBy({
            by: ['createdAt'],
            where: {
                refId: contentId,
                targetType: 'POST',
                deletedAt: null,
                createdAt: {
                    gte: start,
                    lte: end,
                },
            },
            _count: true,
        });

        // Get daily breakdown of reactions
        const reactionsByDay = await this.prisma.reaction.groupBy({
            by: ['createdAt'],
            where: {
                refId: contentId,
                targetType: 'POST',
                deletedAt: null,
                createdAt: {
                    gte: start,
                    lte: end,
                },
            },
            _count: true,
        });

        // Get daily breakdown of shares
        const sharesByDay = await this.prisma.share.groupBy({
            by: ['createdAt'],
            where: {
                refId: contentId,
                createdAt: {
                    gte: start,
                    lte: end,
                },
            },
            _count: true,
        });

        return {
            postId,
            title: post.title,
            period: {
                startDate: start.toISOString().split('T')[0],
                endDate: end.toISOString().split('T')[0],
            },
            trend: {
                commentsByDay,
                reactionsByDay,
                sharesByDay,
            },
        };
    }

    /**
     * Get overall analytics for ALL posts in a date range
     * Returns total: comments, reactions, shares, views
     */
    async getOverallAnalytics(
        startDate?: string,
        endDate?: string,
    ): Promise<{
        totalComments: number;
        totalReactions: number;
        totalShares: number;
        totalViews: number;
        period: {
            startDate: string;
            endDate: string;
        };
    }> {
        const start = this.parseDateTime(startDate);
        const end = this.parseDateTime(endDate);

        console.log(`📊 Overall analytics query`, { startDate, endDate });

        // Get all published posts
        const posts = await this.prisma.post.findMany({
            where: {
                status: 'PUBLISHED',
            },
            select: {
                id: true,
                contentId: true,
            },
        });
        console.log(`📝 Total published posts: ${posts.length}`);

        const contentIds = posts.map((p) => p.contentId);
        const postIds = posts.map((p) => p.id);

        if (postIds.length === 0 && contentIds.length === 0) {
            return {
                totalComments: 0,
                totalReactions: 0,
                totalShares: 0,
                totalViews: 0,
                period: {
                    startDate: start.toISOString().split('T')[0],
                    endDate: end.toISOString().split('T')[0],
                },
            };
        }

        // Count total comments
        const totalComments = await this.prisma.comment.count({
            where: {
                refId: { in: postIds },
                targetType: 'COMMENT',
                // targetType: 'POST',
                deletedAt: null,
                createdAt: {
                    gte: start,
                    lte: end,
                },
            },
        });

        console.log(`💬 Total comments: ${totalComments}`);

        // Count total reactions
        const totalReactions = await this.prisma.reaction.count({
            where: {
                refId: { in: contentIds },
                targetType: 'POST',
                deletedAt: null,
                createdAt: {
                    gte: start,
                    lte: end,
                },
            },
        });

        console.log(`❤️ Total reactions: ${totalReactions}`);

        // Count total shares
        const totalShares = await this.prisma.share.count({
            where: {
                refId: { in: contentIds },
                createdAt: {
                    gte: start,
                    lte: end,
                },
            },
        });

        console.log(`🔗 Total shares: ${totalShares}`);

        // Count total views (placeholder - implement based on your view tracking)
        const totalViews = 0;

        console.log(`📈 Overall stats:`, { totalComments, totalReactions, totalShares, totalViews });

        return {
            totalComments,
            totalReactions,
            totalShares,
            totalViews,
            period: {
                startDate: start.toISOString().split('T')[0],
                endDate: end.toISOString().split('T')[0],
            },
        };
    }
}
