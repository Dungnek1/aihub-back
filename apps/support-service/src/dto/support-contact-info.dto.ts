import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupportContactInfoDto {
    @ApiProperty({
        description: 'Category ID that this contact info belongs to',
        example: 'cat_123',
    })
    categoryId: string;

    @ApiProperty({
        description: 'Title/label of the contact option',
        example: 'Chat to sales',
    })
    title: string;

    @ApiPropertyOptional({
        description: 'Description of the contact option',
        example: 'Speak to our friendly team.',
    })
    description?: string;

    @ApiProperty({
        description: 'Contact value (email, phone, address, etc) - stored as text',
        example: 'sales@untitledui.com',
    })
    value: string;
}

export class UpdateSupportContactInfoDto {
    @ApiPropertyOptional({
        description: 'Title/label of the contact option',
    })
    title?: string;

    @ApiPropertyOptional({
        description: 'Description of the contact option',
    })
    description?: string;

    @ApiPropertyOptional({
        description: 'Contact value (email, phone, address, etc)',
    })
    value?: string;
}

export class SupportContactInfoResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    categoryId: string;

    @ApiProperty()
    title: string;

    @ApiPropertyOptional()
    description?: string;

    @ApiProperty()
    value: string;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}
