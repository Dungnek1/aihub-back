import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNewsletterSubscriptionDto {
    @ApiProperty({
        description: 'Email address for newsletter subscription',
        example: 'user@example.com',
    })
    email: string;

    @ApiPropertyOptional({
        description: 'Source page where the subscription was submitted',
        enum: ['HOME', 'LANDING_PAGE'],
        default: 'HOME',
        example: 'HOME',
    })
    source?: 'HOME' | 'LANDING_PAGE';
}

export class NewsletterSubscriptionResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    email: string;

    @ApiProperty({
        enum: ['HOME', 'LANDING_PAGE'],
        default: 'HOME',
    })
    source: string;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}

