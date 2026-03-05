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
    Inject,
    Headers,
    Body,
    Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { CurrentUser, Public } from '../decorators';
import type { JwtPayload } from '@app/shared/interface.ts/user.interface';

@ApiTags('Media')
@Controller('media')
export class MediaController {
    constructor(
        @Inject('MEDIA_CLIENT') private readonly mediaClient: ClientProxy,
    ) { }

    @Post('upload/image')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Upload image file', operationId: 'uploadImage' })
    @ApiHeader({
        name: 'folder-type',
        description: 'Folder type for organizing uploaded images (e.g., user, default)',
        required: false,
        schema: { type: 'string', default: 'default' }
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Image file (PNG, JPEG, JPG, GIF, WEBP) - Max 5MB',
                },
                alt: {
                    type: 'string',
                    description: 'Alt text for the image (optional)',
                },
                caption: {
                    type: 'string',
                    description: 'Caption for the image (optional)',
                },
                folderType: {
                    type: 'string',
                    description: 'Folder type for organizing uploaded images (e.g., blog, user, default)',
                },
            },
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Image uploaded successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        filename: { type: 'string' },
                        originalName: { type: 'string' },
                        url: { type: 'string' },
                        mimeType: { type: 'string' },
                        size: { type: 'number' },
                    },
                },
                message: { type: 'string', example: 'Image uploaded successfully' },
            },
        },
    })
    @ApiResponse({ status: 422, description: 'Invalid file type or size' })
    @UseInterceptors(FileInterceptor('file'))
    async uploadImage(
        @CurrentUser() user: JwtPayload,
        @Headers('folder-type') folderType: string = 'user',
        @Req() req: Request,
        @UploadedFile(
            new ParseFilePipeBuilder()
                // .addFileTypeValidator({
                //     fileType: /\.(png|jpeg|jpg|gif|webp)$/i,
                // })
                .addMaxSizeValidator({
                    maxSize: 5 * 1024 * 1024, // 5MB
                })
                .build({
                    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
                }),
        )
        file: Express.Multer.File,
    ) {
        // Get alt and caption from req.body (multipart/form-data)
        // FileInterceptor parses multipart/form-data and puts text fields in req.body
        const alt = (req.body?.alt as string) || '';
        const caption = (req.body?.caption as string) || '';

        console.log('[MediaController] Upload image request received:', {
            filename: file?.filename,
            originalName: file?.originalname,
            mimeType: file?.mimetype,
            size: file?.size,
            alt,
            caption,
            folderType,
            bodyKeys: Object.keys(req.body || {}),
            bodyAlt: req.body?.alt,
            bodyCaption: req.body?.caption,
            hasFile: !!file,
        });

        if (!file) {
            throw new Error('No file uploaded');
        }

        if (!file.filename) {
            throw new Error('File filename is missing. Make sure file was uploaded correctly.');
        }

        // Get base URL from request - handle proxy headers
        const protocol = req.get('x-forwarded-proto') || req.protocol;
        const host = req.get('x-forwarded-host') || req.get('host');
        const baseUrl = `${protocol}://${host}`;

        console.log('[MediaController] Base URL:', { protocol, host, baseUrl, headers: { 'x-forwarded-proto': req.get('x-forwarded-proto'), 'x-forwarded-host': req.get('x-forwarded-host'), 'host': req.get('host') } });

        const result = await firstValueFrom(
            this.mediaClient.send('media.upload.image', {
                filename: file.filename,
                originalName: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                type: 'image',
                userId: user.userId,
                folderType: folderType,
                alt: alt,
                caption: caption,
                baseUrl: baseUrl,
            }),
        );

        return result;
    }

    @Post('upload/public-image')
    @Public()
    @ApiOperation({ summary: 'Upload image file (Public - No authentication required)', operationId: 'uploadPublicImage' })
    @ApiHeader({
        name: 'folder-type',
        description: 'Folder type for organizing uploaded images (e.g., user, default)',
        required: false,
        schema: { type: 'string', default: 'default' }
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Image file (PNG, JPEG, JPG, GIF, WEBP) - Max 5MB',
                },
                alt: {
                    type: 'string',
                    description: 'Alt text for the image (optional)',
                },
                caption: {
                    type: 'string',
                    description: 'Caption for the image (optional)',
                },
                folderType: {
                    type: 'string',
                    description: 'Folder type for organizing uploaded images (e.g., blog, user, default)',
                },
            },
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Image uploaded successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        filename: { type: 'string' },
                        originalName: { type: 'string' },
                        url: { type: 'string' },
                        mimeType: { type: 'string' },
                        size: { type: 'number' },
                    },
                },
                message: { type: 'string', example: 'Image uploaded successfully' },
            },
        },
    })
    @ApiResponse({ status: 422, description: 'Invalid file type or size' })
    @UseInterceptors(FileInterceptor('file'))
    async uploadPublicImage(
        @Headers('folder-type') folderTypeHeader: string,
        @Req() req: Request,
        @UploadedFile(
            new ParseFilePipeBuilder()
                // .addFileTypeValidator({
                //     fileType: /\.(png|jpeg|jpg|gif|webp)$/i,
                // })
                .addMaxSizeValidator({
                    maxSize: 5 * 1024 * 1024, // 5MB
                })
                .build({
                    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
                }),
        )
        file: Express.Multer.File,
    ) {
        // Get alt and caption from req.body (multipart/form-data)
        // FileInterceptor parses multipart/form-data and puts text fields in req.body
        const alt = (req.body?.alt as string) || '';
        const caption = (req.body?.caption as string) || '';
        
        // Get folderType from body (priority) or header (fallback)
        const folderType = (req.body?.folderType as string) || folderTypeHeader || 'default';

        console.log('[MediaController] Upload public image request received:', {
            filename: file?.filename,
            originalName: file?.originalname,
            mimeType: file?.mimetype,
            size: file?.size,
            alt,
            caption,
            folderType,
            folderTypeFromBody: req.body?.folderType,
            folderTypeFromHeader: folderTypeHeader,
            bodyKeys: Object.keys(req.body || {}),
            hasFile: !!file,
        });

        if (!file) {
            throw new Error('No file uploaded');
        }

        if (!file.filename) {
            throw new Error('File filename is missing. Make sure file was uploaded correctly.');
        }

        // Get base URL from request - handle proxy headers
        const protocol = req.get('x-forwarded-proto') || req.protocol;
        const host = req.get('x-forwarded-host') || req.get('host');
        const baseUrl = `${protocol}://${host}`;

        console.log('[MediaController] Public upload - Base URL:', { protocol, host, baseUrl, headers: { 'x-forwarded-proto': req.get('x-forwarded-proto'), 'x-forwarded-host': req.get('x-forwarded-host'), 'host': req.get('host') } });

        const result = await firstValueFrom(
            this.mediaClient.send('media.upload.image', {
                filename: file.filename,
                originalName: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                type: 'image',
                userId: null, // No user for public upload
                folderType: folderType,
                alt: alt,
                caption: caption,
                baseUrl: baseUrl,
            }),
        );

        return result;
    }

    @Post('upload/audio')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Upload audio file', operationId: 'uploadAudio' })
    @ApiHeader({
        name: 'folder-type',
        description: 'Folder type for organizing uploaded audio files (e.g., user, default)',
        required: false,
        schema: { type: 'string', default: 'default' }
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Audio file (MP3, WAV, OGG, M4A, AAC, FLAC) - Max 10MB',
                },
            },
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Audio uploaded successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        filename: { type: 'string' },
                        originalName: { type: 'string' },
                        url: { type: 'string' },
                        mimeType: { type: 'string' },
                        size: { type: 'number' },
                    },
                },
                message: { type: 'string', example: 'Audio uploaded successfully' },
            },
        },
    })
    @ApiResponse({ status: 422, description: 'Invalid file type or size' })
    @UseInterceptors(FileInterceptor('file'))
    async uploadAudio(
        @CurrentUser() user: JwtPayload,
        @UploadedFile(
            new ParseFilePipeBuilder()
                .addFileTypeValidator({
                    fileType: /\.(mp3|wav|ogg|m4a|aac|flac)$/i,
                })
                .addMaxSizeValidator({
                    maxSize: 10 * 1024 * 1024, // 10MB
                })
                .build({
                    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
                }),
        )
        file: Express.Multer.File,
    ) {
        const result = await firstValueFrom(
            this.mediaClient.send('media.upload.audio', {
                filename: file.filename,
                originalName: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                type: 'audio',
                userId: user.userId,
            }),
        );

        return result;
    }

    // @Get(':id')
    // @Public()
    // @ApiOperation({ summary: 'Get media by ID', operationId: 'getMedia' })
    // @ApiResponse({ status: 200, description: 'Media retrieved successfully' })
    // @ApiResponse({ status: 404, description: 'Media not found' })
    // async getMedia(@Param('id') id: string) {
    //     return firstValueFrom(
    //         this.mediaClient.send('media.get', { id }),
    //     );
    // }

    @Delete(':id')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Delete media', operationId: 'deleteMedia' })
    @ApiResponse({ status: 200, description: 'Media deleted successfully' })
    @ApiResponse({ status: 404, description: 'Media not found' })
    async deleteMedia(@Param('id') id: string) {
        return firstValueFrom(
            this.mediaClient.send('media.delete', { id }),
        );
    }


}
