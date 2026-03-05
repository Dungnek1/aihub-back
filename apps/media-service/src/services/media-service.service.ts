import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MediaServiceService {
  private readonly logger = new Logger(MediaServiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) { }

  async saveMediaRecord(data: {
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    type: 'image' | 'audio';
    userId: string;
    folderType?: string;
    alt?: string;
    caption?: string;
    baseUrl?: string;
  }) {
    try {
      const fullFilename = data.folderType
        ? `${data.type}/${data.folderType}/${data.filename}`
        : data.filename;

      this.logger.log(`Saving media record: ${fullFilename}, userId: ${data.userId || 'null'}`);

      const media = await this.prisma.media.create({
        data: {
          filename: fullFilename,
          originalName: data.originalName,
          mimeType: data.mimeType,
          size: data.size,
          metadata: JSON.stringify({ type: data.type, caption: data.caption }),
          alt: data.alt || null,
          createdBy: data.userId || null,
          uploadedId: data.userId || null
        },
      });

      // Return media with URL
      const url = this.getMediaUrl(fullFilename, data.baseUrl);
      this.logger.log(`Media saved successfully: ${media.id}, URL: ${url}, baseUrl: ${data.baseUrl}`);

      const result = {
        ...media,
        url,
      };

      this.logger.log(`Returning media object:`, JSON.stringify(result, null, 2));

      return result;

    } catch (error) {
      this.logger.error(`Error saving media: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getMediaById(id: string) {
    return this.prisma.media.findUnique({
      where: { id },
    });
  }

  async deleteMedia(id: string) {
    try {
      const media = await this.prisma.media.findUnique({
        where: { id },
      });

      if (!media) {
        throw new Error('Media not found');
      }

      // Delete from database
      await this.prisma.media.delete({
        where: { id },
      });

      this.logger.log(`Media deleted: ${id}`);
      return { success: true, message: 'Media deleted successfully' };
    } catch (error) {
      this.logger.error(`Error deleting media: ${error.message}`);
      throw error;
    }
  }

  // ===== ADMIN METHODS =====

  async getMediaAdmin(query: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
  }): Promise<{ items: any[]; total: number }> {
    const { page = 0, limit = 20, search, type } = query;

    const where: any = {};

    if (search) {
      where.OR = [
        { filename: { contains: search, mode: 'insensitive' } },
        { originalName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.filename = { startsWith: type };
    }

    const [media, total] = await Promise.all([
      this.prisma.media.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: page * limit,
        take: limit,
      }),
      this.prisma.media.count({ where }),
    ]);

    return {
      items: media.map(item => ({
        ...item,
        url: this.getMediaUrl(item.filename, undefined),
      })),
      total,
    };
  }

  async deleteMediaAdmin(mediaId: string): Promise<void> {
    await this.deleteMedia(mediaId);
  }

  getMediaUrl(filePath: string, baseUrl?: string): string {
    // Use provided baseUrl or fall back to config
    const rawBase = baseUrl ||
      this.configService.get('API_GATEWAY_BASE_URL') ||
      'http://localhost:9000';

    // Remove trailing /api/v1 and trailing slashes to avoid double paths
    const cleanBase = rawBase
      .replace(/\/api\/v1\/?$/, '')
      .replace(/\/+$/, '');

    const cleanPath = (filePath || '').replace(/^\/+/, '');
    const fullUrl = `${cleanBase}/${cleanPath}`;
    
    this.logger.log(`Generated URL: ${fullUrl} from base: ${cleanBase} and path: ${cleanPath}`);
    return fullUrl;
  }
}
