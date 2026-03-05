import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, Min, Max, IsBoolean } from 'class-validator';

export enum ToolMarketingStatusEnum {
    PUBLIC = 'PUBLIC',
    PRIVATE = 'PRIVATE',
    DRAFT = 'DRAFT',
}

export class CreateToolMarketingDto {
    @ApiProperty({ example: 'Advanced Marketing Tools' })
    @IsString()
    title: string;

    @ApiProperty({ example: 'Learn Marketing from basics to advanced', required: false })
    @IsOptional()
    @IsString()
    shortDesc?: string;

    @ApiProperty({ example: 'Complete guide to Marketing...', required: false })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ example: 'price-id-456' })
    @IsString()
    priceId: string;

    @ApiProperty({ example: 'category-id-789', required: false })
    @IsOptional()
    @IsString()
    categoryId?: string;

    @ApiProperty({ example: '<h1>Tool Marketing</h1>', required: false })
    @IsOptional()
    @IsString()
    bodyHtml?: string;

    @ApiProperty({
        example: { title: 'Marketing Tool', keywords: ['marketing', 'tools'] },
        required: false,
    })
    @IsOptional()
    seo?: any;

    @ApiProperty({ example: 'cover-image-id-999', required: false })
    @IsOptional()
    @IsString()
    coverImageId?: string;

    @ApiProperty({ example: 'user-id-123', required: false })
    @IsOptional()
    @IsString()
    createdBy?: string;

    @ApiProperty({ example: 'advanced-marketing-tools', required: false })
    @IsOptional()
    @IsString()
    slug?: string;

    @ApiProperty({ example: true, description: 'Tool Marketing nổi bật', required: false, default: true })
    @IsOptional()
    @IsBoolean()
    isFeatured?: boolean;

    @ApiProperty({ example: 'https://example.com/tool-marketing', description: 'Link tham chiếu đến tool marketing', required: false })
    @IsOptional()
    @IsString()
    link?: string;

    @ApiProperty({ example: 'PUBLIC', enum: ToolMarketingStatusEnum, required: false, default: 'DRAFT' })
    @IsOptional()
    @IsEnum(ToolMarketingStatusEnum)
    status?: ToolMarketingStatusEnum;
}

export class UpdateToolMarketingDto extends PartialType(CreateToolMarketingDto) {
    @ApiProperty({ example: 'PUBLIC', enum: ToolMarketingStatusEnum, required: false })
    @IsOptional()
    @IsEnum(ToolMarketingStatusEnum)
    status?: ToolMarketingStatusEnum;

    @ApiProperty({ example: 'user-id-123', required: false })
    @IsOptional()
    @IsString()
    updatedBy?: string;
}

export class ToolMarketingResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    title: string;

    @ApiProperty()
    shortDesc?: string;

    @ApiProperty()
    description?: string;

    @ApiProperty()
    slug: string;

    @ApiProperty()
    priceId: string;

    @ApiProperty()
    categoryId?: string;

    @ApiProperty()
    coverImageId?: string;

    @ApiProperty()
    bodyHtml?: string;

    @ApiProperty()
    seo?: any;

    @ApiProperty()
    status: ToolMarketingStatusEnum;

    @ApiProperty()
    chapterCount: number;

    @ApiProperty()
    lessonCount: number;

    @ApiProperty()
    documentCount: number;

    @ApiProperty()
    viewsCount: number;

    @ApiProperty()
    reactionsCount: number;

    @ApiProperty()
    sharesCount: number;

    @ApiProperty()
    commentsCount: number;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    @ApiProperty()
    createdBy?: string;

    @ApiProperty()
    updatedBy?: string;

    @ApiProperty()
    deletedAt?: Date;

    @ApiProperty()
    deletedBy?: string;

    @ApiProperty({ example: 'https://example.com/tool-marketing', required: false })
    link?: string;

    @ApiProperty()
    isFeatured: boolean;
}

export class CreateToolMarketingRatingDto {
    @ApiProperty({ example: 4, minimum: 1, maximum: 5 })
    @IsNumber()
    @Min(1)
    @Max(5)
    rating: number;

    @ApiProperty({ example: 'Great tool marketing!', required: false })
    @IsOptional()
    @IsString()
    feedback?: string;

    @ApiProperty({ example: 'Well structured and easy to follow', required: false })
    @IsOptional()
    @IsString()
    comment?: string;

    @ApiProperty({ example: 5, minimum: 1, maximum: 5, required: false })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(5)
    contentQuality?: number;

    @ApiProperty({ example: 4, minimum: 1, maximum: 5, required: false })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(5)
    instructorQuality?: number;

    @ApiProperty({ example: 4, minimum: 1, maximum: 5, required: false })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(5)
    learningOutcome?: number;

    @ApiProperty({ example: 5, minimum: 1, maximum: 5, required: false })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(5)
    materialsQuality?: number;
}

export class ToolMarketingRatingResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    toolMarketingId: string;

    @ApiProperty()
    userId: string;

    @ApiProperty()
    rating: number;

    @ApiProperty()
    feedback?: string;

    @ApiProperty()
    comment?: string;

    @ApiProperty()
    contentQuality?: number;

    @ApiProperty()
    instructorQuality?: number;

    @ApiProperty()
    learningOutcome?: number;

    @ApiProperty()
    materialsQuality?: number;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    @ApiProperty()
    createdBy?: string;

    @ApiProperty()
    updatedBy?: string;
}

export class PaginationDto {
    @ApiProperty({ example: 0 })
    skip: number;

    @ApiProperty({ example: 10 })
    take: number;
}

