export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BANNED = 'BANNED',
}

export enum PostType {
  NEWS = 'NEWS',
  BLOG = 'BLOG',
}

export enum ContentType {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED',
  REMOVED = 'REMOVED',
}

export enum ReactionType {
  LIKE = 'LIKE',
  LOVE = 'LOVE',
  HAHA = 'HAHA',
  WOW = 'WOW',
  SAD = 'SAD',
  ANGRY = 'ANGRY',
  THUONGTHUONG = 'THUONGTHUONG',
}

export enum NotificationType {
  NEW_POST_FROM_FOLLOWING = 'new_post_from_following',
  NEW_TOOL = 'new_tool',
  NEW_FOLLOWER = 'new_follower',
  COMMENT_ON_POST = 'comment_on_post',
  REACTION_ON_POST = 'reaction_on_post',
  ADMIN_ACTION = 'admin_action',
  MODERATION_STATUS_CHANGE = 'moderation_status_change',
  TOOL_RATED = 'tool_rated',
  POST_PENDING_REVIEW = 'post_pending_review',
}

export enum ApplicationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum ContentKind {
  NEWS = 'news',
  STATUS = 'status',
}

export enum TaskType {
  USER_POST = 'USER_POST',
  REVIEW_CONTENT = 'REVIEW_CONTENT',
}

export enum DeliveryChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH_NOTIFICATION = 'PUSH_NOTIFICATION',
}

export enum DigestPeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
}

export enum ContentTargetType {
  POST = 'POST',
  STATUS_FEED = 'STATUS_FEED',
  COMMENT = 'COMMENT',
}

export enum DeliveryStatus {
  QUEUED = 'queued',
  SEND = 'send',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  REJECTED = 'rejected',
}

export enum HandlerType {
  AI = 'ai',
  AGENT = 'agent',
}

export enum ConversationStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  PENDING = 'pending',
}

export enum AuthProvider {
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  GITHUB = 'github',
  APPLE = 'apple',
  KEYCLOAK = 'keycloak',
  CUSTOM = 'custom',
}

export enum SupportChannel {
  AI_CHAT = 'AI_CHAT',
  WEB_SUPPORT = 'WEB_SUPPORT',
}

export enum SupportTicketStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_CUSTOMER = 'WAITING_CUSTOMER',
  WAITING_AGENT = 'WAITING_AGENT',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  REOPENED = 'REOPENED',
}

export enum SupportTicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum SupportAgentStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  BUSY = 'BUSY',
  AWAY = 'AWAY',
}

export enum MessageSenderType {
  USER = 'USER',
  AGENT = 'AGENT',
  SYSTEM = 'SYSTEM',
  AI = 'AI',
}
