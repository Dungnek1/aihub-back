import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { SupportAgentService } from '../service/support-agent.service';
import { SupportTicketService } from '../service/support-ticket.service';
import { SupportMessageService } from '../service/support-message.service';
import { SupportRatingService } from '../service/support-rating.service';
import { SupportCategoryService } from '../service/support-category.service';
import { SupportActivityLogService } from '../service/support-activity-log.service';
import { SupportContactRequestService } from '../service/support-contact-request.service';
import { SupportContactInfoService } from '../service/support-contact-info.service';
import { NewsletterSubscriptionService } from '../service/newsletter-subscription.service';

@Controller()
export class SupportServiceController {
  private readonly logger = new Logger(SupportServiceController.name);

  constructor(
    private readonly agentService: SupportAgentService,
    private readonly ticketService: SupportTicketService,
    private readonly messageService: SupportMessageService,
    private readonly ratingService: SupportRatingService,
    private readonly categoryService: SupportCategoryService,
    private readonly activityLogService: SupportActivityLogService,
    private readonly contactRequestService: SupportContactRequestService,
    private readonly contactInfoService: SupportContactInfoService,
    private readonly newsletterSubscriptionService: NewsletterSubscriptionService,
  ) { }

  // ===== SUPPORT AGENT MESSAGE PATTERNS =====

  @MessagePattern('support.agent.create')
  async createAgent(@Payload() data: any) {
    this.logger.debug(`[support.agent.create] Data: ${JSON.stringify(data)}`);
    return await this.agentService.createAgent(data);
  }

  @MessagePattern('support.agent.list')
  async getAgents(@Payload() query: any) {
    this.logger.debug(`[support.agent.list] Query: ${JSON.stringify(query)}`);
    return await this.agentService.getAgents(query);
  }

  @MessagePattern('support.agent.get')
  async getAgent(@Payload() data: any) {
    this.logger.debug(`[support.agent.get] AgentId: ${data.agentId}`);
    return await this.agentService.getAgentById(data.agentId);
  }

  @MessagePattern('support.agent.update')
  async updateAgent(@Payload() data: any) {
    this.logger.debug(`[support.agent.update] AgentId: ${data.agentId}`);
    return await this.agentService.updateAgent(data.agentId, data);
  }

  @MessagePattern('support.agent.update-status')
  async updateAgentStatus(@Payload() data: any) {
    this.logger.debug(`[support.agent.update-status] AgentId: ${data.agentId}`);
    return await this.agentService.updateAgentStatus(data.agentId, data.status);
  }

  @MessagePattern('support.agent.activate')
  async activateAgent(@Payload() data: any) {
    this.logger.debug(`[support.agent.activate] AgentId: ${data.agentId}`);
    return await this.agentService.activateAgent(data.agentId, data.isActive);
  }

  @MessagePattern('support.agent.delete')
  async deleteAgent(@Payload() data: any) {
    this.logger.debug(`[support.agent.delete] AgentId: ${data.agentId}`);
    return await this.agentService.deleteAgent(data.agentId);
  }

  @MessagePattern('support.agent.tickets')
  async getAgentTickets(@Payload() data: any) {
    this.logger.debug(`[support.agent.tickets] AgentId: ${data.agentId}`);
    return await this.agentService.getAgentTickets(data.agentId, data.query);
  }

  @MessagePattern('support.agent.stats')
  async getAgentStats(@Payload() data: any) {
    this.logger.debug(`[support.agent.stats] AgentId: ${data.agentId}`);
    return await this.agentService.getAgentStats(data.agentId);
  }

  // ===== SUPPORT CATEGORY MESSAGE PATTERNS =====

  @MessagePattern('support.category.create')
  async createCategory(@Payload() data: any) {
    this.logger.debug(`[support.category.create] Data: ${JSON.stringify(data)}`);
    return await this.categoryService.createCategory(data);
  }

  @MessagePattern('support.category.list')
  async getCategories(@Payload() query: any) {
    this.logger.debug(`[support.category.list] Query: ${JSON.stringify(query)}`);
    return await this.categoryService.getCategories(query);
  }

  @MessagePattern('support.category.get')
  async getCategory(@Payload() data: any) {
    this.logger.debug(`[support.category.get] CategoryId: ${data.categoryId}`);
    return await this.categoryService.getCategoryById(data.categoryId);
  }

  @MessagePattern('support.category.update')
  async updateCategory(@Payload() data: any) {
    this.logger.debug(`[support.category.update] CategoryId: ${data.categoryId}`);
    return await this.categoryService.updateCategory(data.categoryId, data);
  }

  @MessagePattern('support.category.delete')
  async deleteCategory(@Payload() data: any) {
    this.logger.debug(`[support.category.delete] CategoryId: ${data.categoryId}`);
    return await this.categoryService.deleteCategory(data.categoryId);
  }

  @MessagePattern('support.category.tickets')
  async getCategoryTickets(@Payload() data: any) {
    this.logger.debug(`[support.category.tickets] CategoryId: ${data.categoryId}`);
    return await this.categoryService.getCategoryTickets(data.categoryId, data.query);
  }

  // ===== SUPPORT TICKET MESSAGE PATTERNS =====

  @MessagePattern('support.ticket.create')
  async createTicket(@Payload() data: any) {
    this.logger.debug(`[support.ticket.create] Data: ${JSON.stringify(data)}`);
    return await this.ticketService.createTicket(data);
  }

  @MessagePattern('support.ticket.list')
  async getTickets(@Payload() query: any) {
    this.logger.debug(`[support.ticket.list] Query: ${JSON.stringify(query)}`);
    return await this.ticketService.getTickets(query);
  }

  @MessagePattern('support.ticket.get')
  async getTicket(@Payload() data: any) {
    this.logger.debug(`[support.ticket.get] TicketId: ${data.ticketId}`);
    return await this.ticketService.getTicketById(data.ticketId);
  }

  @MessagePattern('support.ticket.update')
  async updateTicket(@Payload() data: any) {
    this.logger.debug(`[support.ticket.update] TicketId: ${data.ticketId}`);
    return await this.ticketService.updateTicket(data.ticketId, data);
  }

  @MessagePattern('support.ticket.update-status')
  async updateTicketStatus(@Payload() data: any) {
    this.logger.debug(
      `[support.ticket.update-status] TicketId: ${data.ticketId}`,
    );
    return await this.ticketService.updateTicketStatus(data.ticketId, data.status);
  }

  @MessagePattern('support.ticket.update-priority')
  async updateTicketPriority(@Payload() data: any) {
    this.logger.debug(
      `[support.ticket.update-priority] TicketId: ${data.ticketId}`,
    );
    return await this.ticketService.updateTicketPriority(
      data.ticketId,
      data.priority,
    );
  }

  @MessagePattern('support.ticket.assign')
  async assignTicket(@Payload() data: any) {
    this.logger.debug(`[support.ticket.assign] TicketId: ${data.ticketId}`);
    return await this.ticketService.assignTicket(data.ticketId, data.agentId);
  }

  @MessagePattern('support.ticket.unassign')
  async unassignTicket(@Payload() data: any) {
    this.logger.debug(`[support.ticket.unassign] TicketId: ${data.ticketId}`);
    return await this.ticketService.unassignTicket(data.ticketId);
  }

  @MessagePattern('support.ticket.close')
  async closeTicket(@Payload() data: any) {
    this.logger.debug(`[support.ticket.close] TicketId: ${data.ticketId}`);
    return await this.ticketService.closeTicket(data.ticketId);
  }

  @MessagePattern('support.ticket.reopen')
  async reopenTicket(@Payload() data: any) {
    this.logger.debug(`[support.ticket.reopen] TicketId: ${data.ticketId}`);
    return await this.ticketService.reopenTicket(data.ticketId);
  }

  @MessagePattern('support.ticket.delete')
  async deleteTicket(@Payload() data: any) {
    this.logger.debug(`[support.ticket.delete] TicketId: ${data.ticketId}`);
    return await this.ticketService.deleteTicket(data.ticketId);
  }

  @MessagePattern('support.ticket.analytics')
  async getTicketAnalytics(@Payload() query: any) {
    this.logger.debug(`[support.ticket.analytics] Query: ${JSON.stringify(query)}`);
    return await this.ticketService.getTicketAnalytics(query);
  }

  // ===== SUPPORT MESSAGE MESSAGE PATTERNS =====

  @MessagePattern('support.message.create')
  async createMessage(@Payload() data: any) {
    this.logger.debug(`[support.message.create] Data: ${JSON.stringify(data)}`);
    return await this.messageService.createMessage(data);
  }

  @MessagePattern('support.message.list')
  async getMessages(@Payload() data: any) {
    this.logger.debug(`[support.message.list] TicketId: ${data.ticketId}`);
    return await this.messageService.getMessages(data.ticketId, data.query);
  }

  @MessagePattern('support.message.get')
  async getMessage(@Payload() data: any) {
    this.logger.debug(`[support.message.get] MessageId: ${data.messageId}`);
    return await this.messageService.getMessageById(data.ticketId, data.messageId);
  }

  @MessagePattern('support.message.update')
  async updateMessage(@Payload() data: any) {
    this.logger.debug(`[support.message.update] MessageId: ${data.messageId}`);
    return await this.messageService.updateMessage(
      data.ticketId,
      data.messageId,
      data,
    );
  }

  @MessagePattern('support.message.mark-read')
  async markMessageAsRead(@Payload() data: any) {
    this.logger.debug(`[support.message.mark-read] MessageId: ${data.messageId}`);
    return await this.messageService.markMessageAsRead(
      data.ticketId,
      data.messageId,
    );
  }

  @MessagePattern('support.message.delete')
  async deleteMessage(@Payload() data: any) {
    this.logger.debug(`[support.message.delete] MessageId: ${data.messageId}`);
    return await this.messageService.deleteMessage(data.ticketId, data.messageId);
  }

  @MessagePattern('support.message.mark-all-read')
  async markAllMessagesAsRead(@Payload() data: any) {
    this.logger.debug(
      `[support.message.mark-all-read] TicketId: ${data.ticketId}`,
    );
    return await this.messageService.markAllMessagesAsRead(
      data.ticketId,
      data.senderId,
    );
  }

  // ===== SUPPORT RATING MESSAGE PATTERNS =====

  @MessagePattern('support.rating.create')
  async createRating(@Payload() data: any) {
    this.logger.debug(`[support.rating.create] Data: ${JSON.stringify(data)}`);
    return await this.ratingService.createRating(data);
  }

  @MessagePattern('support.rating.get')
  async getRating(@Payload() data: any) {
    this.logger.debug(`[support.rating.get] TicketId: ${data.ticketId}`);
    return await this.ratingService.getRatingByTicket(data.ticketId);
  }

  @MessagePattern('support.rating.update')
  async updateRating(@Payload() data: any) {
    this.logger.debug(`[support.rating.update] TicketId: ${data.ticketId}`);
    return await this.ratingService.updateRating(data.ticketId, data);
  }

  @MessagePattern('support.rating.delete')
  async deleteRating(@Payload() data: any) {
    this.logger.debug(`[support.rating.delete] TicketId: ${data.ticketId}`);
    return await this.ratingService.deleteRating(data.ticketId);
  }

  @MessagePattern('support.rating.agent-list')
  async getAgentRatings(@Payload() data: any) {
    this.logger.debug(`[support.rating.agent-list] AgentId: ${data.agentId}`);
    return await this.ratingService.getAgentRatings(data.agentId, data.query);
  }

  @MessagePattern('support.rating.agent-stats')
  async getAgentRatingStats(@Payload() data: any) {
    this.logger.debug(`[support.rating.agent-stats] AgentId: ${data.agentId}`);
    return await this.ratingService.getAgentRatingStats(data.agentId);
  }

  @MessagePattern('support.rating.system-stats')
  async getSystemRatingStats(@Payload() query: any) {
    this.logger.debug(`[support.rating.system-stats] Query: ${JSON.stringify(query)}`);
    return await this.ratingService.getSystemRatingStats(query);
  }

  // ===== SUPPORT ACTIVITY LOG MESSAGE PATTERNS =====

  @MessagePattern('support.activity-log.list')
  async getActivityLogs(@Payload() data: any) {
    this.logger.debug(`[support.activity-log.list] TicketId: ${data.ticketId}`);
    return await this.activityLogService.getActivityLogs(data.ticketId, data.query);
  }

  @MessagePattern('support.activity-log.get')
  async getActivityLog(@Payload() data: any) {
    this.logger.debug(`[support.activity-log.get] LogId: ${data.logId}`);
    return await this.activityLogService.getActivityLogById(
      data.ticketId,
      data.logId,
    );
  }

  // ===== SUPPORT CONTACT REQUEST MESSAGE PATTERNS =====

  @MessagePattern('support.contact-request.create')
  async createContactRequest(@Payload() data: any) {
    this.logger.debug(`[support.contact-request.create] Data: ${JSON.stringify(data)}`);
    return await this.contactRequestService.createContactRequest(data);
  }

  @MessagePattern('support.contact-request.list')
  async getContactRequests(@Payload() query: any) {
    this.logger.debug(`[support.contact-request.list] Query: ${JSON.stringify(query)}`);
    return await this.contactRequestService.getContactRequests(query.skip, query.take);
  }

  @MessagePattern('support.contact-request.get')
  async getContactRequest(@Payload() data: any) {
    this.logger.debug(`[support.contact-request.get] Id: ${data.id}`);
    return await this.contactRequestService.getContactRequestById(data.id);
  }

  @MessagePattern('support.contact-request.update-status')
  async updateContactRequestStatus(@Payload() data: any) {
    this.logger.debug(`[support.contact-request.update-status] Id: ${data.id}`);
    return await this.contactRequestService.updateContactRequestStatus(data.id, data);
  }

  @MessagePattern('support.contact-request.by-status')
  async getContactRequestsByStatus(@Payload() query: any) {
    this.logger.debug(`[support.contact-request.by-status] Status: ${query.status}`);
    return await this.contactRequestService.getContactRequestsByStatus(query.status, query.skip, query.take);
  }

  @MessagePattern('support.contact-request.delete')
  async deleteContactRequest(@Payload() data: any) {
    this.logger.debug(`[support.contact-request.delete] Id: ${data.id}`);
    return await this.contactRequestService.deleteContactRequest(data.id);
  }

  @MessagePattern('admin.getContactRequests')
  async getContactRequestsAdmin(@Payload() query: any) {
    this.logger.debug(`[admin.getContactRequests] Query: ${JSON.stringify(query)}`);
    return await this.contactRequestService.getContactRequestsAdmin(query);
  }

  @MessagePattern('admin.updateContactRequestStatus')
  async updateContactRequestStatusAdmin(@Payload() data: any) {
    this.logger.debug(`[admin.updateContactRequestStatus] Id: ${data.id}, Status: ${data.status}`);
    return await this.contactRequestService.updateContactRequestStatus(data.id, { status: data.status });
  }

  // ===== SUPPORT CONTACT INFO MESSAGE PATTERNS =====

  @MessagePattern('support.contact-info.create')
  async createContactInfo(@Payload() data: any) {
    this.logger.debug(`[support.contact-info.create] Data: ${JSON.stringify(data)}`);
    return await this.contactInfoService.createContactInfo(data);
  }

  @MessagePattern('support.contact-info.by-category')
  async getContactInfoByCategory(@Payload() query: any) {
    this.logger.debug(`[support.contact-info.by-category] CategoryId: ${query.categoryId}`);
    return await this.contactInfoService.getContactInfoByCategory(query.categoryId, query.skip, query.take);
  }

  @MessagePattern('support.contact-info.get')
  async getContactInfo(@Payload() data: any) {
    this.logger.debug(`[support.contact-info.get] Id: ${data.id}`);
    return await this.contactInfoService.getContactInfo(data.id);
  }

  @MessagePattern('support.contact-info.update')
  async updateContactInfo(@Payload() data: any) {
    this.logger.debug(`[support.contact-info.update] Id: ${data.id}`);
    return await this.contactInfoService.updateContactInfo(data.id, data);
  }

  @MessagePattern('support.contact-info.delete')
  async deleteContactInfo(@Payload() data: any) {
    this.logger.debug(`[support.contact-info.delete] Id: ${data.id}`);
    return await this.contactInfoService.deleteContactInfo(data.id);
  }

  @MessagePattern('support.contact-info.delete-by-category')
  async deleteContactInfoByCategory(@Payload() data: any) {
    this.logger.debug(`[support.contact-info.delete-by-category] CategoryId: ${data.categoryId}`);
    return await this.contactInfoService.deleteContactInfoByCategory(data.categoryId);
  }

  @MessagePattern('support.contact-info.list-all')
  async getAllContactInfo(@Payload() query: any) {
    this.logger.debug(`[support.contact-info.list-all] Query: ${JSON.stringify(query)}`);
    return await this.contactInfoService.getAllContactInfo(query.skip, query.take);
  }

  // ===== NEWSLETTER SUBSCRIPTION MESSAGE PATTERNS =====

  @MessagePattern('support.newsletter-subscription.create')
  async createNewsletterSubscription(@Payload() data: any) {
    this.logger.debug(`[support.newsletter-subscription.create] Data: ${JSON.stringify(data)}`);
    return await this.newsletterSubscriptionService.createSubscription(data);
  }

  @MessagePattern('support.newsletter-subscription.list')
  async getNewsletterSubscriptions(@Payload() query: any) {
    this.logger.debug(`[support.newsletter-subscription.list] Query: ${JSON.stringify(query)}`);
    return await this.newsletterSubscriptionService.getSubscriptions(query.skip, query.take);
  }

  @MessagePattern('admin.getNewsletterSubscriptions')
  async getNewsletterSubscriptionsAdmin(@Payload() query: any) {
    this.logger.debug(`[admin.getNewsletterSubscriptions] Query: ${JSON.stringify(query)}`);
    return await this.newsletterSubscriptionService.getSubscriptionsAdmin(query);
  }

  @MessagePattern('admin.deleteNewsletterSubscription')
  async deleteNewsletterSubscription(@Payload() data: any) {
    this.logger.debug(`[admin.deleteNewsletterSubscription] Id: ${data.id}`);
    return await this.newsletterSubscriptionService.deleteSubscription(data.id);
  }
}
