import { IsString, IsOptional, IsISO8601 } from 'class-validator';

export class PostAnalyticsQueryDto {
    @IsString()
    postId: string;

    @IsOptional()
    @IsISO8601()
    startDate?: string; // ISO 8601 format: YYYY-MM-DD

    @IsOptional()
    @IsISO8601()
    endDate?: string; // ISO 8601 format: YYYY-MM-DD
}

export class PostAnalyticsResponseDto {
    postId: string;
    title: string;

    // Statistics
    totalComments: number;
    totalReactions: number;
    totalShares: number;
    totalViews: number;

    // Reaction breakdown
    reactionBreakdown: {
        like: number;
        love: number;
        haha: number;
        wow: number;
        sad: number;
        angry: number;
        thuongthuong: number;
    };

    // Period info
    period?: {
        startDate: string;
        endDate: string;
    };

    // Engagement metrics
    engagementRate?: number; // (comments + reactions + shares) / views
}

export class MultiPostAnalyticsQueryDto {
    @IsOptional()
    @IsISO8601()
    startDate?: string;

    @IsOptional()
    @IsISO8601()
    endDate?: string;

    @IsOptional()
    limit?: number;

    @IsOptional()
    offset?: number;
}

export class MultiPostAnalyticsResponseDto {
    data: PostAnalyticsResponseDto[];
    total: number;
    period?: {
        startDate: string;
        endDate: string;
    };
}
