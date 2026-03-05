import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, Min, Max, IsBoolean } from 'class-validator';

export enum CourseStatusEnum {
    PUBLIC = 'PUBLIC',
    PRIVATE = 'PRIVATE',
    DRAFT = 'DRAFT',
}

export class CreateCourseDto {
    @ApiProperty({ example: 'Advanced TypeScript Fundamentals' })
    @IsString()
    title: string;

    @ApiProperty({ example: 'Learn TypeScript from basics to advanced', required: false })
    @IsOptional()
    @IsString()
    shortDesc?: string;

    @ApiProperty({ example: 'Complete guide to TypeScript...', required: false })
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

    @ApiProperty({ example: '<h1>Course</h1>', required: false })
    @IsOptional()
    @IsString()
    bodyHtml?: string;

    @ApiProperty({
        example: { title: 'TypeScript Course', keywords: ['typescript', 'programming'] },
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

    @ApiProperty({ example: 'advanced-typescript-fundamentals', required: false })
    @IsOptional()
    @IsString()
    slug?: string;

    @ApiProperty({ example: true, description: 'Khóa học nổi bật', required: false, default: true })
    @IsOptional()
    @IsBoolean()
    isFeatured?: boolean;

    @ApiProperty({ example: 'https://example.com/course', description: 'Link tham chiếu đến khóa học', required: false })
    @IsOptional()
    @IsString()
    link?: string;

    @ApiProperty({ example: 'PUBLIC', enum: CourseStatusEnum, required: false, default: 'DRAFT' })
    @IsOptional()
    @IsEnum(CourseStatusEnum)
    status?: CourseStatusEnum;
}

export class UpdateCourseDto extends PartialType(CreateCourseDto) {
    @ApiProperty({ example: 'PUBLIC', enum: CourseStatusEnum, required: false })
    @IsOptional()
    @IsEnum(CourseStatusEnum)
    status?: CourseStatusEnum;

    @ApiProperty({ example: 'user-id-123', required: false })
    @IsOptional()
    @IsString()
    updatedBy?: string;
}

export class CourseResponseDto {
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
    status: CourseStatusEnum;

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

    @ApiProperty({ example: 'https://example.com/course', required: false })
    link?: string;

    @ApiProperty()
    isFeatured: boolean;
}

export class CreateCourseRatingDto {
    @ApiProperty({ example: 4, minimum: 1, maximum: 5 })
    @IsNumber()
    @Min(1)
    @Max(5)
    rating: number;

    @ApiProperty({ example: 'Great course!', required: false })
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

export class CourseRatingResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    courseId: string;

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
