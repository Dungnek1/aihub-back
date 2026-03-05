import { Injectable } from "@nestjs/common";
import { MulterModuleOptions, MulterOptionsFactory } from "@nestjs/platform-express";
import fs from "fs"
import { diskStorage } from "multer";
import path, { join } from "path";

@Injectable()
export class MulterConfigService implements MulterOptionsFactory {
    getRootPath = () => {
        return process.cwd();
    };

    ensureExists(targetDirectory: string) {
        fs.mkdir(targetDirectory, { recursive: true }, (error) => {
            if (!error) {
                console.log('Directory successfully created, or it already exists.');
                return;
            }
            switch (error.code) {
                case 'EEXIST':
                    // Error:
                    // Requested location already exists, but it's not a directory.
                    break;
                case 'ENOTDIR':
                    // Error:
                    // The parent hierarchy contains a file with the same name as the dir
                    // you're trying to create.
                    break;
                default:
                    // Some other error like permission denied.
                    console.error(error);
                    break;
            }
        });
    }
    createMulterOptions(): MulterModuleOptions {
        return {
            storage: diskStorage({
                destination: (req, file, cb) => {
                    let type = 'default';

                    // Determine type based on mimetype
                    if (file.mimetype.startsWith('image/')) {
                        type = 'image';
                    } else if (file.mimetype.startsWith('audio/')) {
                        type = 'audio';
                    }

                    const folder = req?.headers?.['folder_type'] || req?.headers?.['folder-type'] || "default";

                    // Đảm bảo cả 2 cấp thư mục được tạo
                    const basePath = `public/${type}`;
                    const fullPath = `${basePath}/${folder}`;
                    
                    console.log('[Multer] Upload destination:', {
                        type,
                        folder,
                        basePath,
                        fullPath,
                        mimetype: file.mimetype,
                        originalname: file.originalname
                    });
                    
                    this.ensureExists(basePath);     // Tạo 'public/type'
                    this.ensureExists(fullPath);     // Tạo 'public/type/folder'

                    cb(null, join(this.getRootPath(), fullPath));
                },
                filename: (req, file, cb) => {
                    // get image extension
                    let extName = path.extname(file.originalname);

                    // get image's name (without extension)
                    let baseName = path.basename(file.originalname, extName);

                    let finalName = `${baseName}-${Date.now()}${extName}`;
                    
                    console.log('[Multer] Filename generated:', {
                        original: file.originalname,
                        final: finalName,
                        mimetype: file.mimetype
                    });
                    
                    cb(null, finalName);
                }
            }),
            // Preserve text fields in req.body
            preservePath: false,
        }
    }

}