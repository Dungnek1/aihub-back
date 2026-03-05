import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupportContactRequestDto {
    @ApiProperty({
        description: 'Name of the person contacting',
        example: 'John Doe',
    })
    name: string;

    @ApiProperty({
        description: 'Email address',
        example: 'john@example.com',
    })
    email: string;

    @ApiPropertyOptional({
        description: 'Phone number',
        example: '0123456789',
    })
    phone?: string;

    @ApiProperty({
        description: 'Contact message',
        example: 'I need help with...',
    })
    message: string;

    @ApiPropertyOptional({
        description: 'Source page where the request was submitted',
        enum: ['HOME', 'LANDING_PAGE'],
        default: 'HOME',
        example: 'HOME',
    })
    source?: 'HOME' | 'LANDING_PAGE';
}

export class UpdateSupportContactRequestStatusDto {
    @ApiProperty({
        description: 'Status of the contact request',
        enum: ['NEW', 'PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED', 'CONTACTED'],
        example: 'IN_PROGRESS',
    })
    status: string;
}

export class SupportContactRequestResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    email: string;

    @ApiPropertyOptional()
    phone?: string;

    @ApiProperty()
    message: string;

    @ApiProperty({
        enum: ['HOME', 'LANDING_PAGE'],
        default: 'HOME',
    })
    source: string;

    @ApiProperty({
        enum: ['NEW', 'PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED', 'CONTACTED'],
    })
    status: string;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}
