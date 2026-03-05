import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupportAgentStatus } from '@prisma/client';

export class CreateSupportAgentDto {
    @ApiProperty({ description: 'User ID' })
    userId: string;

    @ApiProperty({ description: 'Agent name' })
    name: string;

    @ApiProperty({ description: 'Agent email' })
    email: string;

    @ApiPropertyOptional({ description: 'Agent phone number' })
    phone?: string;

    @ApiPropertyOptional({ description: 'Agent avatar URL' })
    avatar?: string;

    @ApiPropertyOptional({ description: 'Agent bio' })
    bio?: string;

    @ApiPropertyOptional({ description: 'Maximum tickets agent can handle', default: 5 })
    maxTickets?: number;
}

export class UpdateSupportAgentDto {
    @ApiPropertyOptional({ description: 'Agent name' })
    name?: string;

    @ApiPropertyOptional({ description: 'Agent email' })
    email?: string;

    @ApiPropertyOptional({ description: 'Agent phone number' })
    phone?: string;

    @ApiPropertyOptional({ description: 'Agent avatar URL' })
    avatar?: string;

    @ApiPropertyOptional({ description: 'Agent bio' })
    bio?: string;

    @ApiPropertyOptional({ description: 'Maximum tickets agent can handle' })
    maxTickets?: number;
}

export class UpdateAgentStatusDto {
    @ApiProperty({ enum: SupportAgentStatus, description: 'Agent status' })
    status: SupportAgentStatus;
}

export class ActivateAgentDto {
    @ApiProperty({ type: Boolean, description: 'Is agent active' })
    isActive: boolean;
}

export class SupportAgentResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    userId: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    email: string;

    @ApiPropertyOptional()
    phone?: string;

    @ApiPropertyOptional()
    avatar?: string;

    @ApiPropertyOptional()
    bio?: string;

    @ApiProperty({ enum: SupportAgentStatus })
    status: SupportAgentStatus;

    @ApiProperty()
    isActive: boolean;

    @ApiProperty()
    maxTickets: number;

    @ApiProperty()
    currentLoad: number;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}
