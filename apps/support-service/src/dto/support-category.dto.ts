import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupportCategoryDto {
    @ApiProperty({ description: 'Category name' })
    name: string;

    @ApiPropertyOptional({ description: 'Category slug (auto-generated from name if not provided)' })
    slug?: string;

    @ApiPropertyOptional({ description: 'Category description' })
    description?: string;

    @ApiPropertyOptional({ description: 'Category icon URL' })
    icon?: string;

    @ApiPropertyOptional({ description: 'Display order', default: 0 })
    order?: number;
}

export class UpdateSupportCategoryDto {
    @ApiPropertyOptional({ description: 'Category name' })
    name?: string;

    @ApiPropertyOptional({ description: 'Category slug' })
    slug?: string;

    @ApiPropertyOptional({ description: 'Category description' })
    description?: string;

    @ApiPropertyOptional({ description: 'Category icon URL' })
    icon?: string;

    @ApiPropertyOptional({ description: 'Display order' })
    order?: number;
}

export class SupportCategoryResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    slug: string;

    @ApiPropertyOptional()
    description?: string;

    @ApiPropertyOptional()
    icon?: string;

    @ApiProperty()
    order: number;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}
