import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';

@Injectable()
export class WebInfoServiceService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  // RuleUser CRUD
  async createRuleUser(data: { content: string }, createdBy?: string) {
    return this.prisma.ruleUser.create({
      data: {
        content: data.content,
        createdBy,
        updatedBy: createdBy,
      },
    });
  }

  async getAllRuleUsers() {
    return this.prisma.ruleUser.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRuleUserById(ruleId: string) {
    return this.prisma.ruleUser.findUnique({
      where: { ruleId },
    });
  }

  async updateRuleUser(ruleId: string, data: { content: string }, updatedBy?: string) {
    return this.prisma.ruleUser.update({
      where: { ruleId },
      data: {
        content: data.content,
        updatedBy,
        updatedAt: new Date(),
      },
    });
  }

  async deleteRuleUser(ruleId: string) {
    return this.prisma.ruleUser.delete({
      where: { ruleId },
    });
  }

  // RuleBlog CRUD
  async createRuleBlog(data: { content: string }, createdBy?: string) {
    return this.prisma.ruleBlog.create({
      data: {
        content: data.content,
        createdBy,
        updatedBy: createdBy,
      },
    });
  }

  async getAllRuleBlogs() {
    return this.prisma.ruleBlog.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRuleBlogById(ruleId: string) {
    return this.prisma.ruleBlog.findUnique({
      where: { ruleId },
    });
  }

  async updateRuleBlog(ruleId: string, data: { content: string }, updatedBy?: string) {
    return this.prisma.ruleBlog.update({
      where: { ruleId },
      data: {
        content: data.content,
        updatedBy,
        updatedAt: new Date(),
      },
    });
  }

  async deleteRuleBlog(ruleId: string) {
    return this.prisma.ruleBlog.delete({
      where: { ruleId },
    });
  }

  // Site Settings CRUD
  async getSiteSettings() {
    let settings = await this.prisma.siteSettings.findUnique({
      where: { id: 'site-settings' },
    });

    if (!settings) {
      // Create default settings if not exists
      settings = await this.prisma.siteSettings.create({
        data: {
          id: 'site-settings',
          siteName: 'AI Tools & Blog',
          siteUrl: 'https://example.com',
          siteDescription: 'Discover and explore the best AI tools and latest trends',
          contactEmail: 'contact@example.com',
          postsPerPage: 10,
          enableComments: true,
          enableReactions: true,
          enableSharing: true,
          moderationRequired: true,
          maintenanceMode: false,
          socialLinks: {
            telegram: '',
            discord: '',
            facebook: '',
            instagram: '',
            twitter: '',
          },
        },
      });
    }

    return settings;
  }

  async updateSiteSettings(data: {
    siteName?: string;
    siteUrl?: string;
    siteDescription?: string;
    contactEmail?: string;
    postsPerPage?: number;
    enableComments?: boolean;
    enableReactions?: boolean;
    enableSharing?: boolean;
    moderationRequired?: boolean;
    maintenanceMode?: boolean;
    socialLinks?: {
      telegram?: string;
      discord?: string;
      facebook?: string;
      instagram?: string;
      twitter?: string;
    };
  }, updatedBy?: string) {
    const existing = await this.prisma.siteSettings.findUnique({
      where: { id: 'site-settings' },
    });

    // Prepare update data
    const updateData: any = {
      updatedBy,
      updatedAt: new Date(),
    };

    // Add non-socialLinks fields
    if (data.siteName !== undefined) updateData.siteName = data.siteName;
    if (data.siteUrl !== undefined) updateData.siteUrl = data.siteUrl;
    if (data.siteDescription !== undefined) updateData.siteDescription = data.siteDescription;
    if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail;
    if (data.postsPerPage !== undefined) updateData.postsPerPage = data.postsPerPage;
    if (data.enableComments !== undefined) updateData.enableComments = data.enableComments;
    if (data.enableReactions !== undefined) updateData.enableReactions = data.enableReactions;
    if (data.enableSharing !== undefined) updateData.enableSharing = data.enableSharing;
    if (data.moderationRequired !== undefined) updateData.moderationRequired = data.moderationRequired;
    if (data.maintenanceMode !== undefined) updateData.maintenanceMode = data.maintenanceMode;

    // Merge socialLinks if provided
    if (data.socialLinks !== undefined && data.socialLinks !== null) {
      if (existing && existing.socialLinks) {
        // Merge with existing socialLinks - only update fields that are explicitly provided
        const existingSocialLinks = existing.socialLinks as any;
        const mergedSocialLinks: any = { ...existingSocialLinks };
        
        // Only update fields that are explicitly provided (not undefined)
        if (data.socialLinks.telegram !== undefined) mergedSocialLinks.telegram = data.socialLinks.telegram || '';
        if (data.socialLinks.discord !== undefined) mergedSocialLinks.discord = data.socialLinks.discord || '';
        if (data.socialLinks.facebook !== undefined) mergedSocialLinks.facebook = data.socialLinks.facebook || '';
        if (data.socialLinks.instagram !== undefined) mergedSocialLinks.instagram = data.socialLinks.instagram || '';
        if (data.socialLinks.twitter !== undefined) mergedSocialLinks.twitter = data.socialLinks.twitter || '';
        
        updateData.socialLinks = mergedSocialLinks;
      } else {
        // Use new socialLinks as is, with defaults for missing fields
        updateData.socialLinks = {
          telegram: data.socialLinks.telegram || '',
          discord: data.socialLinks.discord || '',
          facebook: data.socialLinks.facebook || '',
          instagram: data.socialLinks.instagram || '',
          twitter: data.socialLinks.twitter || '',
        };
      }
    }

    if (existing) {
      return this.prisma.siteSettings.update({
        where: { id: 'site-settings' },
        data: updateData,
      });
    } else {
      return this.prisma.siteSettings.create({
        data: {
          id: 'site-settings',
          ...updateData,
          createdBy: updatedBy,
        },
      });
    }
  }
}
