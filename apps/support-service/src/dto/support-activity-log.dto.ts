import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SupportActivityLogResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    ticketId: string;

    @ApiProperty({ description: 'Action performed on the ticket' })
    action: string;

    @ApiPropertyOptional({ description: 'Previous value before action' })
    oldValue?: string;

    @ApiPropertyOptional({ description: 'New value after action' })
    newValue?: string;

    @ApiPropertyOptional({ description: 'Additional details about the action' })
    details?: string;

    @ApiProperty()
    createdAt: Date;

    @ApiPropertyOptional({ description: 'User or agent who performed the action' })
    createdBy?: string;
}
