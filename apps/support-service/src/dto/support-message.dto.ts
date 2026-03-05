import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageSenderType } from '@prisma/client';

export class CreateSupportMessageDto {
    @ApiProperty({ description: 'Ticket ID' })
    ticketId: string;

    @ApiPropertyOptional({ description: 'Sender ID (User ID or Agent ID)' })
    senderId?: string;

    @ApiPropertyOptional({ description: 'Agent ID' })
    agentId?: string;

    @ApiProperty({ enum: MessageSenderType, description: 'Type of sender' })
    senderType: MessageSenderType;

    @ApiProperty({ description: 'Message content' })
    content: string;

    @ApiPropertyOptional({ type: Boolean, description: 'Is internal note', default: false })
    isInternal?: boolean;

    @ApiPropertyOptional({ type: [String], description: 'Attachment URLs' })
    attachments?: string[];
}

export class UpdateSupportMessageDto {
    @ApiProperty({ description: 'Message content' })
    content: string;
}

export class MarkAllMessagesReadDto {
    @ApiPropertyOptional({ description: 'Sender/User ID to filter messages' })
    senderId?: string;
}

export class SupportMessageResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    ticketId: string;

    @ApiPropertyOptional()
    senderId?: string;

    @ApiPropertyOptional()
    agentId?: string;

    @ApiProperty({ enum: MessageSenderType })
    senderType: MessageSenderType;

    @ApiProperty()
    content: string;

    @ApiProperty()
    isInternal: boolean;

    @ApiProperty()
    isRead: boolean;

    @ApiPropertyOptional()
    readAt?: Date;

    @ApiProperty({ type: [String] })
    attachments: string[];

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}
