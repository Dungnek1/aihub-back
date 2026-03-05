import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    Inject,
    Logger,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Roles, Public, ResponseMessage, CurrentUser } from '../decorators';
import { Role } from '@app/shared/enum/user.enum';
import type { JwtPayload } from '@app/shared/interface.ts/user.interface';

@ApiTags('Support')
@Controller('support')
export class SupportController {
    private readonly logger = new Logger(SupportController.name);

    constructor(
        @Inject('SUPPORT_CLIENT') private readonly supportClient: ClientProxy,
    ) { }

    // ===== SUPPORT AGENT ENDPOINTS =====

    @Post('agents')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Agent created successfully')
    @ApiOperation({ summary: 'Create a new support agent' })
    @ApiBody({ schema: { example: { name: 'John Doe', email: 'john@example.com', departmentId: '123' } } })
    @ApiResponse({ status: 201, description: 'Agent created successfully' })
    async createAgent(@Body() body: any) {
        this.logger.log(`POST /support/agents`);
        return firstValueFrom(
            this.supportClient.send('support.agent.create', body),
        );
    }

    @Get('agents')
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Agents retrieved successfully')
    @ApiOperation({ summary: 'Get all support agents' })
    @ApiQuery({ name: 'skip', required: false, type: Number })
    @ApiQuery({ name: 'take', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'List of agents retrieved' })
    async getAgents(@Query() query: any) {
        this.logger.log(`GET /support/agents`);
        return firstValueFrom(
            this.supportClient.send('support.agent.list', query),
        );
    }

    @Get('agents/:agentId')
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Agent retrieved successfully')
    @ApiOperation({ summary: 'Get a specific support agent by ID' })
    @ApiParam({ name: 'agentId', type: String, description: 'Agent ID' })
    @ApiResponse({ status: 200, description: 'Agent details retrieved' })
    async getAgent(@Param('agentId') agentId: string) {
        this.logger.log(`GET /support/agents/${agentId}`);
        return firstValueFrom(
            this.supportClient.send('support.agent.get', { agentId }),
        );
    }

    @Patch('agents/:agentId')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Agent updated successfully')
    @ApiOperation({ summary: 'Update a support agent' })
    @ApiParam({ name: 'agentId', type: String, description: 'Agent ID' })
    @ApiBody({ schema: { example: { name: 'Jane Doe', email: 'jane@example.com' } } })
    @ApiResponse({ status: 200, description: 'Agent updated successfully' })
    async updateAgent(@Param('agentId') agentId: string, @Body() body: any) {
        this.logger.log(`PATCH /support/agents/${agentId}`);
        return firstValueFrom(
            this.supportClient.send('support.agent.update', { agentId, ...body }),
        );
    }

    @Patch('agents/:agentId/status')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Agent status updated successfully')
    @ApiOperation({ summary: 'Update agent status' })
    @ApiParam({ name: 'agentId', type: String, description: 'Agent ID' })
    @ApiBody({ schema: { example: { status: 'ONLINE' }, enum: ['ONLINE', 'OFFLINE', 'BUSY', 'AWAY'] } })
    @ApiResponse({ status: 200, description: 'Agent status updated' })
    async updateAgentStatus(
        @Param('agentId') agentId: string,
        @Body() body: any,
    ) {
        this.logger.log(`PATCH /support/agents/${agentId}/status`);
        return firstValueFrom(
            this.supportClient.send('support.agent.update-status', {
                agentId,
                ...body,
            }),
        );
    }

    @Patch('agents/:agentId/activate')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Agent activation status updated successfully')
    @ApiOperation({ summary: 'Activate or deactivate an agent' })
    @ApiParam({ name: 'agentId', type: String, description: 'Agent ID' })
    @ApiBody({ schema: { example: { isActive: true } } })
    @ApiResponse({ status: 200, description: 'Agent activation status updated' })
    async activateAgent(@Param('agentId') agentId: string, @Body() body: any) {
        this.logger.log(`PATCH /support/agents/${agentId}/activate`);
        return firstValueFrom(
            this.supportClient.send('support.agent.activate', { agentId, ...body }),
        );
    }

    @Delete('agents/:agentId')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Agent deleted successfully')
    @ApiOperation({ summary: 'Delete a support agent' })
    @ApiParam({ name: 'agentId', type: String, description: 'Agent ID' })
    @ApiResponse({ status: 200, description: 'Agent deleted successfully' })
    async deleteAgent(@Param('agentId') agentId: string) {
        this.logger.log(`DELETE /support/agents/${agentId}`);
        return firstValueFrom(
            this.supportClient.send('support.agent.delete', { agentId }),
        );
    }

    @Get('agents/:agentId/tickets')
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Agent tickets retrieved successfully')
    @ApiOperation({ summary: 'Get all tickets assigned to an agent' })
    @ApiParam({ name: 'agentId', type: String, description: 'Agent ID' })
    @ApiQuery({ name: 'skip', required: false, type: Number })
    @ApiQuery({ name: 'take', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Agent tickets retrieved' })
    async getAgentTickets(
        @Param('agentId') agentId: string,
        @Query() query: any,
    ) {
        this.logger.log(`GET /support/agents/${agentId}/tickets`);
        return firstValueFrom(
            this.supportClient.send('support.agent.tickets', { agentId, query }),
        );
    }

    @Get('agents/:agentId/stats')
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Agent statistics retrieved successfully')
    @ApiOperation({ summary: 'Get statistics for a support agent' })
    @ApiParam({ name: 'agentId', type: String, description: 'Agent ID' })
    @ApiResponse({ status: 200, description: 'Agent statistics retrieved' })
    async getAgentStats(@Param('agentId') agentId: string) {
        this.logger.log(`GET /support/agents/${agentId}/stats`);
        return firstValueFrom(
            this.supportClient.send('support.agent.stats', { agentId }),
        );
    }

    // ===== SUPPORT CATEGORY ENDPOINTS =====

    @Post('categories')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Category created successfully')
    @ApiOperation({ summary: 'Create a new support category' })
    @ApiBody({ schema: { example: { name: 'Billing', description: 'Billing-related issues' } } })
    @ApiResponse({ status: 201, description: 'Category created successfully' })
    async createCategory(@Body() body: any) {
        this.logger.log(`POST /support/categories`);
        return firstValueFrom(
            this.supportClient.send('support.category.create', body),
        );
    }

    @Get('categories')
    @Public()
    @ResponseMessage('Categories retrieved successfully')
    @ApiOperation({ summary: 'Get all support categories' })
    @ApiQuery({ name: 'skip', required: false, type: Number })
    @ApiQuery({ name: 'take', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'List of categories retrieved' })
    async getCategories(@Query() query: any) {
        this.logger.log(`GET /support/categories`);
        return firstValueFrom(
            this.supportClient.send('support.category.list', query),
        );
    }

    @Get('categories/:categoryId')
    @Public()
    @ResponseMessage('Category retrieved successfully')
    @ApiOperation({ summary: 'Get a specific category by ID' })
    @ApiParam({ name: 'categoryId', type: String, description: 'Category ID' })
    @ApiResponse({ status: 200, description: 'Category details retrieved' })
    async getCategory(@Param('categoryId') categoryId: string) {
        this.logger.log(`GET /support/categories/${categoryId}`);
        return firstValueFrom(
            this.supportClient.send('support.category.get', { categoryId }),
        );
    }

    @Patch('categories/:categoryId')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Category updated successfully')
    @ApiOperation({ summary: 'Update a support category' })
    @ApiParam({ name: 'categoryId', type: String, description: 'Category ID' })
    @ApiBody({ schema: { example: { name: 'Billing Support', description: 'Billing and payment issues' } } })
    @ApiResponse({ status: 200, description: 'Category updated successfully' })
    async updateCategory(
        @Param('categoryId') categoryId: string,
        @Body() body: any,
    ) {
        this.logger.log(`PATCH /support/categories/${categoryId}`);
        return firstValueFrom(
            this.supportClient.send('support.category.update', {
                categoryId,
                ...body,
            }),
        );
    }

    @Delete('categories/:categoryId')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Category deleted successfully')
    @ApiOperation({ summary: 'Delete a support category' })
    @ApiParam({ name: 'categoryId', type: String, description: 'Category ID' })
    @ApiResponse({ status: 200, description: 'Category deleted successfully' })
    async deleteCategory(@Param('categoryId') categoryId: string) {
        this.logger.log(`DELETE /support/categories/${categoryId}`);
        return firstValueFrom(
            this.supportClient.send('support.category.delete', { categoryId }),
        );
    }

    @Get('categories/:categoryId/tickets')
    @Public()
    @ResponseMessage('Category tickets retrieved successfully')
    @ApiOperation({ summary: 'Get all tickets in a category' })
    @ApiParam({ name: 'categoryId', type: String, description: 'Category ID' })
    @ApiQuery({ name: 'skip', required: false, type: Number })
    @ApiQuery({ name: 'take', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Category tickets retrieved' })
    async getCategoryTickets(
        @Param('categoryId') categoryId: string,
        @Query() query: any,
    ) {
        this.logger.log(`GET /support/categories/${categoryId}/tickets`);
        return firstValueFrom(
            this.supportClient.send('support.category.tickets', {
                categoryId,
                query,
            }),
        );
    }

    // ===== SUPPORT TICKET ENDPOINTS =====

    @Post('tickets')
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Ticket created successfully')
    @ApiOperation({ summary: 'Create a new support ticket' })
    @ApiBody({ schema: { example: { subject: 'Cannot login', description: 'I cannot login to my account', categoryId: 'cat1', channel: 'WEB_SUPPORT', priority: 'HIGH' } } })
    @ApiResponse({ status: 201, description: 'Ticket created successfully' })
    async createTicket(@Body() body: any, @CurrentUser() user: JwtPayload) {
        this.logger.log(`POST /support/tickets - User: ${user.userId}`);
        return firstValueFrom(
            this.supportClient.send('support.ticket.create', {
                ...body,
                userId: user.userId,
                createBy: user.userId,
            }),
        );
    }

    @Get('tickets')
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Tickets retrieved successfully')
    @ApiOperation({ summary: 'Get all support tickets' })
    @ApiQuery({ name: 'skip', required: false, type: Number })
    @ApiQuery({ name: 'take', required: false, type: Number })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'priority', required: false })
    @ApiResponse({ status: 200, description: 'List of tickets retrieved' })
    async getTickets(@Query() query: any) {
        this.logger.log(`GET /support/tickets`);
        return firstValueFrom(
            this.supportClient.send('support.ticket.list', query),
        );
    }

    @Get('tickets/:ticketId')
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Ticket retrieved successfully')
    @ApiOperation({ summary: 'Get a specific ticket by ID' })
    @ApiParam({ name: 'ticketId', type: String, description: 'Ticket ID' })
    @ApiResponse({ status: 200, description: 'Ticket details retrieved' })
    async getTicket(@Param('ticketId') ticketId: string) {
        this.logger.log(`GET /support/tickets/${ticketId}`);
        return firstValueFrom(
            this.supportClient.send('support.ticket.get', { ticketId }),
        );
    }

    @Patch('tickets/:ticketId')
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Ticket updated successfully')
    @ApiOperation({ summary: 'Update a support ticket' })
    @ApiParam({ name: 'ticketId', type: String, description: 'Ticket ID' })
    @ApiBody({ schema: { example: { subject: 'Updated subject', description: 'Updated description' } } })
    @ApiResponse({ status: 200, description: 'Ticket updated successfully' })
    async updateTicket(@Param('ticketId') ticketId: string, @Body() body: any) {
        this.logger.log(`PATCH /support/tickets/${ticketId}`);
        return firstValueFrom(
            this.supportClient.send('support.ticket.update', { ticketId, ...body }),
        );
    }

    @Patch('tickets/:ticketId/status')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Ticket status updated successfully')
    @ApiOperation({ summary: 'Update ticket status' })
    @ApiParam({ name: 'ticketId', type: String, description: 'Ticket ID' })
    @ApiBody({ schema: { example: { status: 'IN_PROGRESS' }, description: 'Status values: OPEN, ASSIGNED, IN_PROGRESS, WAITING_CUSTOMER, WAITING_AGENT, RESOLVED, CLOSED, REOPENED' } })
    @ApiResponse({ status: 200, description: 'Ticket status updated' })
    async updateTicketStatus(
        @Param('ticketId') ticketId: string,
        @Body() body: any,
    ) {
        this.logger.log(`PATCH /support/tickets/${ticketId}/status`);
        return firstValueFrom(
            this.supportClient.send('support.ticket.update-status', {
                ticketId,
                ...body,
            }),
        );
    }

    @Patch('tickets/:ticketId/priority')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Ticket priority updated successfully')
    @ApiOperation({ summary: 'Update ticket priority' })
    @ApiParam({ name: 'ticketId', type: String, description: 'Ticket ID' })
    @ApiBody({ schema: { example: { priority: 'HIGH' }, description: 'Priority values: LOW, MEDIUM, HIGH, URGENT' } })
    @ApiResponse({ status: 200, description: 'Ticket priority updated' })
    async updateTicketPriority(
        @Param('ticketId') ticketId: string,
        @Body() body: any,
    ) {
        this.logger.log(`PATCH /support/tickets/${ticketId}/priority`);
        return firstValueFrom(
            this.supportClient.send('support.ticket.update-priority', {
                ticketId,
                ...body,
            }),
        );
    }

    @Patch('tickets/:ticketId/assign')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Ticket assigned successfully')
    @ApiOperation({ summary: 'Assign a ticket to an agent' })
    @ApiParam({ name: 'ticketId', type: String, description: 'Ticket ID' })
    @ApiBody({ schema: { example: { agentId: 'agent123' } } })
    @ApiResponse({ status: 200, description: 'Ticket assigned successfully' })
    async assignTicket(
        @Param('ticketId') ticketId: string,
        @Body() body: any,
    ) {
        this.logger.log(`PATCH /support/tickets/${ticketId}/assign`);
        return firstValueFrom(
            this.supportClient.send('support.ticket.assign', { ticketId, ...body }),
        );
    }

    @Patch('tickets/:ticketId/unassign')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Ticket unassigned successfully')
    @ApiOperation({ summary: 'Unassign a ticket from an agent' })
    @ApiParam({ name: 'ticketId', type: String, description: 'Ticket ID' })
    @ApiResponse({ status: 200, description: 'Ticket unassigned successfully' })
    async unassignTicket(@Param('ticketId') ticketId: string) {
        this.logger.log(`PATCH /support/tickets/${ticketId}/unassign`);
        return firstValueFrom(
            this.supportClient.send('support.ticket.unassign', { ticketId }),
        );
    }

    @Patch('tickets/:ticketId/close')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Ticket closed successfully')
    @ApiOperation({ summary: 'Close a support ticket' })
    @ApiParam({ name: 'ticketId', type: String, description: 'Ticket ID' })
    @ApiResponse({ status: 200, description: 'Ticket closed successfully' })
    async closeTicket(@Param('ticketId') ticketId: string) {
        this.logger.log(`PATCH /support/tickets/${ticketId}/close`);
        return firstValueFrom(
            this.supportClient.send('support.ticket.close', { ticketId }),
        );
    }

    @Patch('tickets/:ticketId/reopen')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Ticket reopened successfully')
    @ApiOperation({ summary: 'Reopen a closed support ticket' })
    @ApiParam({ name: 'ticketId', type: String, description: 'Ticket ID' })
    @ApiResponse({ status: 200, description: 'Ticket reopened successfully' })
    async reopenTicket(@Param('ticketId') ticketId: string) {
        this.logger.log(`PATCH /support/tickets/${ticketId}/reopen`);
        return firstValueFrom(
            this.supportClient.send('support.ticket.reopen', { ticketId }),
        );
    }

    @Delete('tickets/:ticketId')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Ticket deleted successfully')
    @ApiOperation({ summary: 'Delete a support ticket' })
    @ApiParam({ name: 'ticketId', type: String, description: 'Ticket ID' })
    @ApiResponse({ status: 200, description: 'Ticket deleted successfully' })
    async deleteTicket(@Param('ticketId') ticketId: string) {
        this.logger.log(`DELETE /support/tickets/${ticketId}`);
        return firstValueFrom(
            this.supportClient.send('support.ticket.delete', { ticketId }),
        );
    }

    @Get('tickets/analytics/overview')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Ticket analytics retrieved successfully')
    @ApiOperation({ summary: 'Get ticket analytics overview' })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    @ApiResponse({ status: 200, description: 'Ticket analytics retrieved' })
    async getTicketAnalytics(@Query() query: any) {
        this.logger.log(`GET /support/tickets/analytics/overview`);
        return firstValueFrom(
            this.supportClient.send('support.ticket.analytics', query),
        );
    }

    // ===== SUPPORT MESSAGE ENDPOINTS =====

    @Post('tickets/:ticketId/messages')
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Message created successfully')
    @ApiOperation({ summary: 'Create a new message in a ticket' })
    @ApiParam({ name: 'ticketId', type: String, description: 'Ticket ID' })
    @ApiBody({ schema: { example: { senderType: 'USER', content: 'This is my message', isInternal: false } } })
    @ApiResponse({ status: 201, description: 'Message created successfully' })
    async createMessage(
        @Param('ticketId') ticketId: string,
        @Body() body: any,
        @CurrentUser() user: JwtPayload,
    ) {
        this.logger.log(`POST /support/tickets/${ticketId}/messages - User: ${user.userId}`);
        return firstValueFrom(
            this.supportClient.send('support.message.create', {
                ticketId,
                ...body,
                senderId: user.userId,
                createdBy: user.userId,
            }),
        );
    }

    @Get('tickets/:ticketId/messages')
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Messages retrieved successfully')
    @ApiOperation({ summary: 'Get all messages in a ticket' })
    @ApiParam({ name: 'ticketId', type: String, description: 'Ticket ID' })
    @ApiQuery({ name: 'skip', required: false, type: Number })
    @ApiQuery({ name: 'take', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'List of messages retrieved' })
    async getMessages(
        @Param('ticketId') ticketId: string,
        @Query() query: any,
    ) {
        this.logger.log(`GET /support/tickets/${ticketId}/messages`);
        return firstValueFrom(
            this.supportClient.send('support.message.list', { ticketId, query }),
        );
    }

    @Get('tickets/:ticketId/messages/:messageId')
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Message retrieved successfully')
    @ApiOperation({ summary: 'Get a specific message' })
    @ApiParam({ name: 'ticketId', type: String, description: 'Ticket ID' })
    @ApiParam({ name: 'messageId', type: String, description: 'Message ID' })
    @ApiResponse({ status: 200, description: 'Message details retrieved' })
    async getMessage(
        @Param('ticketId') ticketId: string,
        @Param('messageId') messageId: string,
    ) {
        this.logger.log(`GET /support/tickets/${ticketId}/messages/${messageId}`);
        return firstValueFrom(
            this.supportClient.send('support.message.get', { ticketId, messageId }),
        );
    }

    @Patch('tickets/:ticketId/messages/:messageId')
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Message updated successfully')
    @ApiOperation({ summary: 'Update a message' })
    @ApiParam({ name: 'ticketId', type: String, description: 'Ticket ID' })
    @ApiParam({ name: 'messageId', type: String, description: 'Message ID' })
    @ApiBody({ schema: { example: { content: 'Updated message content' } } })
    @ApiResponse({ status: 200, description: 'Message updated successfully' })
    async updateMessage(
        @Param('ticketId') ticketId: string,
        @Param('messageId') messageId: string,
        @Body() body: any,
    ) {
        this.logger.log(`PATCH /support/tickets/${ticketId}/messages/${messageId}`);
        return firstValueFrom(
            this.supportClient.send('support.message.update', {
                ticketId,
                messageId,
                ...body,
            }),
        );
    }

    @Patch('tickets/:ticketId/messages/:messageId/read')
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Message marked as read')
    @ApiOperation({ summary: 'Mark a message as read' })
    @ApiParam({ name: 'ticketId', type: String, description: 'Ticket ID' })
    @ApiParam({ name: 'messageId', type: String, description: 'Message ID' })
    @ApiResponse({ status: 200, description: 'Message marked as read' })
    async markMessageAsRead(
        @Param('ticketId') ticketId: string,
        @Param('messageId') messageId: string,
    ) {
        this.logger.log(
            `PATCH /support/tickets/${ticketId}/messages/${messageId}/read`,
        );
        return firstValueFrom(
            this.supportClient.send('support.message.mark-read', {
                ticketId,
                messageId,
            }),
        );
    }

    @Delete('tickets/:ticketId/messages/:messageId')
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Message deleted successfully')
    @ApiOperation({ summary: 'Delete a message' })
    @ApiParam({ name: 'ticketId', type: String, description: 'Ticket ID' })
    @ApiParam({ name: 'messageId', type: String, description: 'Message ID' })
    @ApiResponse({ status: 200, description: 'Message deleted successfully' })
    async deleteMessage(
        @Param('ticketId') ticketId: string,
        @Param('messageId') messageId: string,
    ) {
        this.logger.log(`DELETE /support/tickets/${ticketId}/messages/${messageId}`);
        return firstValueFrom(
            this.supportClient.send('support.message.delete', {
                ticketId,
                messageId,
            }),
        );
    }

    @Patch('tickets/:ticketId/messages/mark-all-read')
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('All messages marked as read')
    @ApiOperation({ summary: 'Mark all messages in a ticket as read' })
    @ApiParam({ name: 'ticketId', type: String, description: 'Ticket ID' })
    @ApiBody({ schema: { example: {} } })
    @ApiResponse({ status: 200, description: 'All messages marked as read' })
    async markAllMessagesAsRead(
        @Param('ticketId') ticketId: string,
        @Body() body: any,
    ) {
        this.logger.log(
            `PATCH /support/tickets/${ticketId}/messages/mark-all-read`,
        );
        return firstValueFrom(
            this.supportClient.send('support.message.mark-all-read', {
                ticketId,
                ...body,
            }),
        );
    }

    // ===== SUPPORT RATING ENDPOINTS =====

    @Post('tickets/:ticketId/rating')
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Rating created successfully')
    @ApiOperation({ summary: 'Create a rating for a ticket' })
    @ApiParam({ name: 'ticketId', type: String, description: 'Ticket ID' })
    @ApiBody({ schema: { example: { rating: 5, responseTimeRating: 4, resolutionRating: 5, feedback: 'Great service!' } } })
    @ApiResponse({ status: 201, description: 'Rating created successfully' })
    async createRating(
        @Param('ticketId') ticketId: string,
        @Body() body: any,
    ) {
        this.logger.log(`POST /support/tickets/${ticketId}/rating`);
        return firstValueFrom(
            this.supportClient.send('support.rating.create', { ticketId, ...body }),
        );
    }

    @Get('tickets/:ticketId/rating')
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Rating retrieved successfully')
    @ApiOperation({ summary: 'Get rating for a ticket' })
    @ApiParam({ name: 'ticketId', type: String, description: 'Ticket ID' })
    @ApiResponse({ status: 200, description: 'Rating retrieved' })
    async getRating(@Param('ticketId') ticketId: string) {
        this.logger.log(`GET /support/tickets/${ticketId}/rating`);
        return firstValueFrom(
            this.supportClient.send('support.rating.get', { ticketId }),
        );
    }

    @Patch('tickets/:ticketId/rating')
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Rating updated successfully')
    @ApiOperation({ summary: 'Update a ticket rating' })
    @ApiParam({ name: 'ticketId', type: String, description: 'Ticket ID' })
    @ApiBody({ schema: { example: { rating: 4, feedback: 'Good service' } } })
    @ApiResponse({ status: 200, description: 'Rating updated successfully' })
    async updateRating(
        @Param('ticketId') ticketId: string,
        @Body() body: any,
    ) {
        this.logger.log(`PATCH /support/tickets/${ticketId}/rating`);
        return firstValueFrom(
            this.supportClient.send('support.rating.update', { ticketId, ...body }),
        );
    }

    @Delete('tickets/:ticketId/rating')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Rating deleted successfully')
    @ApiOperation({ summary: 'Delete a ticket rating' })
    @ApiParam({ name: 'ticketId', type: String, description: 'Ticket ID' })
    @ApiResponse({ status: 200, description: 'Rating deleted successfully' })
    async deleteRating(@Param('ticketId') ticketId: string) {
        this.logger.log(`DELETE /support/tickets/${ticketId}/rating`);
        return firstValueFrom(
            this.supportClient.send('support.rating.delete', { ticketId }),
        );
    }

    @Get('agents/:agentId/ratings')
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Agent ratings retrieved successfully')
    @ApiOperation({ summary: 'Get all ratings for an agent' })
    @ApiParam({ name: 'agentId', type: String, description: 'Agent ID' })
    @ApiQuery({ name: 'skip', required: false, type: Number })
    @ApiQuery({ name: 'take', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Agent ratings retrieved' })
    async getAgentRatings(
        @Param('agentId') agentId: string,
        @Query() query: any,
    ) {
        this.logger.log(`GET /support/agents/${agentId}/ratings`);
        return firstValueFrom(
            this.supportClient.send('support.rating.agent-list', { agentId, query }),
        );
    }

    @Get('agents/:agentId/ratings/stats')
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Agent rating stats retrieved successfully')
    @ApiOperation({ summary: 'Get rating statistics for an agent' })
    @ApiParam({ name: 'agentId', type: String, description: 'Agent ID' })
    @ApiResponse({ status: 200, description: 'Agent rating stats retrieved' })
    async getAgentRatingStats(@Param('agentId') agentId: string) {
        this.logger.log(`GET /support/agents/${agentId}/ratings/stats`);
        return firstValueFrom(
            this.supportClient.send('support.rating.agent-stats', { agentId }),
        );
    }

    @Get('ratings/system-stats')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('System rating stats retrieved successfully')
    @ApiOperation({ summary: 'Get system-wide rating statistics' })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    @ApiResponse({ status: 200, description: 'System rating stats retrieved' })
    async getSystemRatingStats(@Query() query: any) {
        this.logger.log(`GET /support/ratings/system-stats`);
        return firstValueFrom(
            this.supportClient.send('support.rating.system-stats', query),
        );
    }

    // ===== SUPPORT ACTIVITY LOG ENDPOINTS =====

    @Get('tickets/:ticketId/activity-logs')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Activity logs retrieved successfully')
    @ApiOperation({ summary: 'Get activity logs for a ticket' })
    @ApiParam({ name: 'ticketId', type: String, description: 'Ticket ID' })
    @ApiQuery({ name: 'skip', required: false, type: Number })
    @ApiQuery({ name: 'take', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Activity logs retrieved' })
    async getActivityLogs(
        @Param('ticketId') ticketId: string,
        @Query() query: any,
    ) {
        this.logger.log(`GET /support/tickets/${ticketId}/activity-logs`);
        return firstValueFrom(
            this.supportClient.send('support.activity-log.list', { ticketId, query }),
        );
    }

    @Get('tickets/:ticketId/activity-logs/:logId')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Activity log retrieved successfully')
    @ApiOperation({ summary: 'Get a specific activity log entry' })
    @ApiParam({ name: 'ticketId', type: String, description: 'Ticket ID' })
    @ApiParam({ name: 'logId', type: String, description: 'Activity Log ID' })
    @ApiResponse({ status: 200, description: 'Activity log retrieved' })
    async getActivityLog(
        @Param('ticketId') ticketId: string,
        @Param('logId') logId: string,
    ) {
        this.logger.log(`GET /support/tickets/${ticketId}/activity-logs/${logId}`);
        return firstValueFrom(
            this.supportClient.send('support.activity-log.get', { ticketId, logId }),
        );
    }

    // ===== SUPPORT CONTACT REQUEST ENDPOINTS (PUBLIC) =====

    @Post('contact-requests')
    @Public()
    @ResponseMessage('Contact request submitted successfully')
    @ApiOperation({ summary: 'Submit a contact request (Public endpoint)' })
    @ApiBody({
        schema: {
            example: {
                name: 'John Doe',
                email: 'john@example.com',
                phone: '0123456789',
                message: 'I need help with...',
                source: 'HOME',
            },
            properties: {
                source: {
                    enum: ['HOME', 'LANDING_PAGE'],
                    description: 'Source of the contact request',
                },
            },
        },
    })
    @ApiResponse({ status: 201, description: 'Contact request submitted successfully' })
    async createContactRequest(@Body() body: any) {
        this.logger.log(`POST /support/contact-requests - Email: ${body.email}, Source: ${body.source || 'HOME'}`);
        return firstValueFrom(
            this.supportClient.send('support.contact-request.create', {
                ...body,
                source: body.source || 'HOME',
            }),
        );
    }

    @Get('contact-requests')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Contact requests retrieved successfully')
    @ApiOperation({ summary: 'Get all contact requests (Admin only)' })
    @ApiQuery({ name: 'skip', required: false, type: Number })
    @ApiQuery({ name: 'take', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Contact requests retrieved' })
    async getContactRequests(@Query() query: any) {
        this.logger.log(`GET /support/contact-requests`);
        return firstValueFrom(
            this.supportClient.send('support.contact-request.list', query),
        );
    }

    @Get('contact-requests/:id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Contact request retrieved successfully')
    @ApiOperation({ summary: 'Get a specific contact request (Admin only)' })
    @ApiParam({ name: 'id', type: String, description: 'Contact Request ID' })
    @ApiResponse({ status: 200, description: 'Contact request details retrieved' })
    async getContactRequest(@Param('id') id: string) {
        this.logger.log(`GET /support/contact-requests/${id}`);
        return firstValueFrom(
            this.supportClient.send('support.contact-request.get', { id }),
        );
    }

    @Patch('contact-requests/:id/status')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Contact request status updated successfully')
    @ApiOperation({ summary: 'Update contact request status (Admin only)' })
    @ApiParam({ name: 'id', type: String, description: 'Contact Request ID' })
    @ApiBody({ schema: { example: { status: 'IN_PROGRESS' }, enum: ['NEW', 'PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED', 'CONTACTED'] } })
    @ApiResponse({ status: 200, description: 'Contact request status updated' })
    async updateContactRequestStatus(
        @Param('id') id: string,
        @Body() body: any,
    ) {
        this.logger.log(`PATCH /support/contact-requests/${id}/status`);
        return firstValueFrom(
            this.supportClient.send('support.contact-request.update-status', { id, ...body }),
        );
    }

    @Get('contact-requests/by-status/:status')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Contact requests retrieved successfully')
    @ApiOperation({ summary: 'Get contact requests by status (Admin only)' })
    @ApiParam({ name: 'status', type: String, description: 'Status filter', enum: ['PENDING', 'CONTACTED', 'RESOLVED'] })
    @ApiQuery({ name: 'skip', required: false, type: Number })
    @ApiQuery({ name: 'take', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Contact requests filtered by status' })
    async getContactRequestsByStatus(
        @Param('status') status: string,
        @Query() query: any,
    ) {
        this.logger.log(`GET /support/contact-requests/by-status/${status}`);
        return firstValueFrom(
            this.supportClient.send('support.contact-request.by-status', { status, ...query }),
        );
    }

    @Delete('contact-requests/:id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Contact request deleted successfully')
    @ApiOperation({ summary: 'Delete a contact request (Admin only)' })
    @ApiParam({ name: 'id', type: String, description: 'Contact Request ID' })
    @ApiResponse({ status: 200, description: 'Contact request deleted successfully' })
    async deleteContactRequest(@Param('id') id: string) {
        this.logger.log(`DELETE /support/contact-requests/${id}`);
        return firstValueFrom(
            this.supportClient.send('support.contact-request.delete', { id }),
        );
    }

    // ===== SUPPORT CONTACT INFO ENDPOINTS =====

    @Post('contact-info')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Contact info created successfully')
    @ApiOperation({ summary: 'Create contact information for a category (Admin only)' })
    @ApiBody({ schema: { example: { categoryId: '123', title: 'Sales Chat', description: 'Chat with our sales team', value: 'sales@example.com' } } })
    @ApiResponse({ status: 201, description: 'Contact info created successfully' })
    async createContactInfo(@Body() body: any) {
        this.logger.log(`POST /support/contact-info - Category: ${body.categoryId}, Type: ${body.type}`);
        return firstValueFrom(
            this.supportClient.send('support.contact-info.create', body),
        );
    }

    @Get('categories/:categoryId/contact-info')
    @Public()
    @ResponseMessage('Contact information retrieved successfully')
    @ApiOperation({ summary: 'Get contact information for a category (Public)' })
    @ApiParam({ name: 'categoryId', type: String, description: 'Category ID' })
    @ApiQuery({ name: 'skip', required: false, type: Number })
    @ApiQuery({ name: 'take', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Contact information retrieved' })
    async getContactInfoByCategory(
        @Param('categoryId') categoryId: string,
        @Query() query: any,
    ) {
        this.logger.log(`GET /support/categories/${categoryId}/contact-info`);
        return firstValueFrom(
            this.supportClient.send('support.contact-info.by-category', { categoryId, ...query }),
        );
    }

    @Get('contact-info/:id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Contact info retrieved successfully')
    @ApiOperation({ summary: 'Get specific contact information (Admin only)' })
    @ApiParam({ name: 'id', type: String, description: 'Contact Info ID' })
    @ApiResponse({ status: 200, description: 'Contact info details retrieved' })
    async getContactInfo(@Param('id') id: string) {
        this.logger.log(`GET /support/contact-info/${id}`);
        return firstValueFrom(
            this.supportClient.send('support.contact-info.get', { id }),
        );
    }

    @Patch('contact-info/:id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Contact info updated successfully')
    @ApiOperation({ summary: 'Update contact information (Admin only)' })
    @ApiParam({ name: 'id', type: String, description: 'Contact Info ID' })
    @ApiBody({ schema: { example: { title: 'Updated Title', value: 'newemail@example.com' } } })
    @ApiResponse({ status: 200, description: 'Contact info updated successfully' })
    async updateContactInfo(@Param('id') id: string, @Body() body: any) {
        this.logger.log(`PATCH /support/contact-info/${id}`);
        return firstValueFrom(
            this.supportClient.send('support.contact-info.update', { id, ...body }),
        );
    }

    @Delete('contact-info/:id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Contact info deleted successfully')
    @ApiOperation({ summary: 'Delete contact information (Admin only)' })
    @ApiParam({ name: 'id', type: String, description: 'Contact Info ID' })
    @ApiResponse({ status: 200, description: 'Contact info deleted successfully' })
    async deleteContactInfo(@Param('id') id: string) {
        this.logger.log(`DELETE /support/contact-info/${id}`);
        return firstValueFrom(
            this.supportClient.send('support.contact-info.delete', { id }),
        );
    }

    @Delete('categories/:categoryId/contact-info')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ResponseMessage('Contact information deleted successfully')
    @ApiOperation({ summary: 'Delete all contact information for a category (Admin only)' })
    @ApiParam({ name: 'categoryId', type: String, description: 'Category ID' })
    @ApiResponse({ status: 200, description: 'Contact information deleted successfully' })
    async deleteContactInfoByCategory(@Param('categoryId') categoryId: string) {
        this.logger.log(`DELETE /support/categories/${categoryId}/contact-info`);
        return firstValueFrom(
            this.supportClient.send('support.contact-info.delete-by-category', { categoryId }),
        );
    }

    @Get('contact-info')
    @Public()
    @ResponseMessage('All contact information retrieved successfully')
    @ApiOperation({ summary: 'Get all contact information with category details (Admin only)' })
    @ApiQuery({ name: 'skip', required: false, type: Number, description: 'Number of records to skip' })
    @ApiQuery({ name: 'take', required: false, type: Number, description: 'Number of records to take (limit)' })
    @ApiResponse({ status: 200, description: 'All contact information retrieved with category details' })
    async getAllContactInfo(@Query() query: any) {
        this.logger.log(`GET /support/contact-info - skip: ${query.skip || 0}, take: ${query.take || 10}`);
        return firstValueFrom(
            this.supportClient.send('support.contact-info.list-all', {
                skip: parseInt(query.skip) || 0,
                take: parseInt(query.take) || 10
            }),
        );
    }

    // ===== NEWSLETTER SUBSCRIPTION ENDPOINTS (PUBLIC) =====

    @Post('newsletter-subscriptions')
    @Public()
    @ResponseMessage('Newsletter subscription created successfully')
    @ApiOperation({ summary: 'Subscribe to newsletter (Public endpoint)' })
    @ApiBody({ 
        schema: { 
            example: { 
                email: 'user@example.com',
                source: 'HOME'
            } 
        } 
    })
    @ApiResponse({ status: 201, description: 'Newsletter subscription created successfully' })
    async createNewsletterSubscription(@Body() body: any) {
        this.logger.log(`POST /support/newsletter-subscriptions - Email: ${body.email}, Source: ${body.source || 'HOME'}`);
        return firstValueFrom(
            this.supportClient.send('support.newsletter-subscription.create', body),
        );
    }

    @Get('newsletter-subscriptions')
    @Roles(Role.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get all newsletter subscriptions (Admin only)' })
    @ApiQuery({ name: 'skip', required: false, type: Number })
    @ApiQuery({ name: 'take', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Newsletter subscriptions retrieved successfully' })
    async getNewsletterSubscriptions(@Query() query: any): Promise<unknown> {
        this.logger.log(`GET /support/newsletter-subscriptions`);
        return firstValueFrom(
            this.supportClient.send('support.newsletter-subscription.list', {
                skip: parseInt(query.skip) || 0,
                take: parseInt(query.take) || 10,
            }),
        );
    }
}
