import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
  ParseFilePipeBuilder,
  HttpException,
} from '@nestjs/common';

import { MessagePattern, Payload } from '@nestjs/microservices';
import { MediaServiceService } from '../services/media-service.service';


@Controller('media')
export class MediaServiceController {
  constructor(private readonly mediaServiceService: MediaServiceService) { }


  @Get(':id')
  async getMedia(@Param('id') id: string) {
    try {
      const media = await this.mediaServiceService.getMediaById(id);
      if (!media) {
        throw new HttpException('Media not found', HttpStatus.NOT_FOUND);
      }
      return media;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get media',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async deleteMedia(@Param('id') id: string) {
    return this.mediaServiceService.deleteMedia(id);
  }

  // ===== RabbitMQ Message Pattern Handlers =====

  @MessagePattern('media.upload.image')
  async handleUploadImage(@Payload() data: any) {
    return this.mediaServiceService.saveMediaRecord(data);
  }

  @MessagePattern('media.upload.audio')
  async handleUploadAudio(@Payload() data: any) {
    return this.mediaServiceService.saveMediaRecord(data);
  }

  @MessagePattern('media.get')
  async handleGetMedia(@Payload() data: { id: string }) {
    return this.mediaServiceService.getMediaById(data.id);
  }

  @MessagePattern('media.get.url')
  async handleGetMediaUrl(@Payload() data: { id: string }) {
    return this.mediaServiceService.getMediaUrl(data.id);
  }

  @MessagePattern('media.delete')
  async handleDeleteMedia(@Payload() data: { id: string }) {
    return this.mediaServiceService.deleteMedia(data.id);
  }

  // ===== ADMIN MESSAGE PATTERNS =====

  @MessagePattern('admin.getMedia')
  async handleAdminGetMedia(@Payload() data: any) {
    return this.mediaServiceService.getMediaAdmin(data);
  }

  @MessagePattern('admin.deleteMedia')
  async handleAdminDeleteMedia(@Payload() data: { mediaId: string }) {
    await this.mediaServiceService.deleteMediaAdmin(data.mediaId);
    return { success: true };
  }
}
