import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupportChannel, SupportTicketPriority, SupportTicketStatus } from '@prisma/client';

export class CreateSupportTicketDto {
    @ApiPropertyOptional({ description: 'User ID (auto-filled from JWT)' })
    userId?: string;

    @ApiProperty({ description: 'Category ID' })
    categoryId: string;

    @ApiPropertyOptional({ enum: SupportChannel, description: 'Support channel', default: 'WEB_SUPPORT' })
    channel?: SupportChannel;

    @ApiProperty({ description: 'Ticket subject/title' })
    subject: string;

    @ApiPropertyOptional({ description: 'Ticket description' })
    description?: string;

    @ApiPropertyOptional({ enum: SupportTicketPriority, description: 'Ticket priority', default: 'MEDIUM' })
    priority?: SupportTicketPriority;

    @ApiPropertyOptional({ type: [String], description: 'Ticket tags' })
    tags?: string[];

    @ApiPropertyOptional({ type: [String], description: 'Attachment URLs' })
    attachments?: string[];

    @ApiPropertyOptional({ description: 'Created by user ID (auto-filled from JWT)' })
    createBy?: string;
}

export class UpdateSupportTicketDto {
    @ApiPropertyOptional({ description: 'Ticket subject/title' })
    subject?: string;

    @ApiPropertyOptional({ description: 'Ticket description' })
    description?: string;

    @ApiPropertyOptional({ type: [String], description: 'Ticket tags' })
    tags?: string[];
}

export class UpdateTicketStatusDto {
    @ApiProperty({ enum: SupportTicketStatus, description: 'New ticket status' })
    status: SupportTicketStatus;
}

export class UpdateTicketPriorityDto {
    @ApiProperty({ enum: SupportTicketPriority, description: 'New ticket priority' })
    priority: SupportTicketPriority;
}

export class AssignTicketDto {
    @ApiProperty({ description: 'Agent ID' })
    agentId: string;
}

export class SupportTicketResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    ticketNumber: string;

    @ApiProperty()
    userId: string;

    @ApiPropertyOptional()
    agentId?: string;

    @ApiProperty()
    categoryId: string;

    @ApiProperty({ enum: SupportChannel })
    channel: SupportChannel;

    @ApiProperty()
    title: string;

    @ApiPropertyOptional()
    description?: string;

    @ApiProperty({ enum: SupportTicketStatus })
    status: SupportTicketStatus;

    @ApiProperty({ enum: SupportTicketPriority })
    priority: SupportTicketPriority;

    @ApiProperty()
    aiResolved: boolean;

    @ApiProperty({ type: [String] })
    tags: string[];

    @ApiProperty({ type: [String] })
    attachments: string[];

    @ApiPropertyOptional()
    resolvedAt?: Date;

    @ApiPropertyOptional()
    closedAt?: Date;

    @ApiPropertyOptional()
    firstResponseAt?: Date;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}

export class TicketAnalyticsResponseDto {
    @ApiProperty()
    total: number;

    @ApiProperty()
    open: number;

    @ApiProperty()
    assigned: number;

    @ApiProperty()
    in_progress: number;

    @ApiProperty()
    waiting_customer: number;

    @ApiProperty()
    waiting_agent: number;

    @ApiProperty()
    resolved: number;

    @ApiProperty()
    closed: number;

    @ApiProperty()
    reopened: number;

    @ApiProperty()
    startDate: Date;

    @ApiProperty()
    endDate: Date;
}
