import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupportRatingDto {
    @ApiProperty({ description: 'Ticket ID' })
    ticketId: string;

    @ApiProperty({ description: 'Overall rating (1-5)', minimum: 1, maximum: 5 })
    rating: number;

    @ApiPropertyOptional({ description: 'Response time rating (1-5)', minimum: 1, maximum: 5 })
    responseTimeRating?: number;

    @ApiPropertyOptional({ description: 'Resolution rating (1-5)', minimum: 1, maximum: 5 })
    resolutionRating?: number;

    @ApiPropertyOptional({ description: 'Communication rating (1-5)', minimum: 1, maximum: 5 })
    communicationRating?: number;

    @ApiPropertyOptional({ description: 'Feedback text' })
    feedback?: string;

    @ApiPropertyOptional({ description: 'Comment text' })
    comment?: string;
}

export class UpdateSupportRatingDto {
    @ApiPropertyOptional({ description: 'Overall rating (1-5)', minimum: 1, maximum: 5 })
    rating?: number;

    @ApiPropertyOptional({ description: 'Response time rating (1-5)', minimum: 1, maximum: 5 })
    responseTimeRating?: number;

    @ApiPropertyOptional({ description: 'Resolution rating (1-5)', minimum: 1, maximum: 5 })
    resolutionRating?: number;

    @ApiPropertyOptional({ description: 'Communication rating (1-5)', minimum: 1, maximum: 5 })
    communicationRating?: number;

    @ApiPropertyOptional({ description: 'Feedback text' })
    feedback?: string;

    @ApiPropertyOptional({ description: 'Comment text' })
    comment?: string;
}

export class SupportRatingResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    ticketId: string;

    @ApiProperty()
    userId: string;

    @ApiPropertyOptional()
    agentId?: string;

    @ApiProperty()
    rating: number;

    @ApiPropertyOptional()
    responseTimeRating?: number;

    @ApiPropertyOptional()
    resolutionRating?: number;

    @ApiPropertyOptional()
    communicationRating?: number;

    @ApiPropertyOptional()
    feedback?: string;

    @ApiPropertyOptional()
    comment?: string;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}

export class AgentRatingStatsDto {
    @ApiProperty()
    averageRating: number;

    @ApiProperty()
    totalRatings: number;

    @ApiPropertyOptional()
    averageResponseTimeRating?: number;

    @ApiPropertyOptional()
    averageResolutionRating?: number;

    @ApiPropertyOptional()
    averageCommunicationRating?: number;
}
