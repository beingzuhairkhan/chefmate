import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService implements OnModuleInit {
  private readonly logger = new Logger(CloudinaryService.name);
  private configured = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const cloudName = this.config.get<string>('app.cloudinaryCloudName');
    const apiKey = this.config.get<string>('app.cloudinaryApiKey');
    const apiSecret = this.config.get<string>('app.cloudinaryApiSecret');
    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
      this.configured = true;
      this.logger.log('Cloudinary configured');
    } else {
      this.logger.warn('Cloudinary credentials missing — image uploads will return placeholder URLs');
    }
  }

  isConfigured() {
    return this.configured;
  }

  async uploadImage(file: Express.Multer.File, folder = 'chefmate'): Promise<{ url: string; publicId: string }> {
    if (!this.configured) {
      return {
        url: `https://images.unsplash.com/photo-1546069661-61ac7c39d63c?w=800&q=80`,
        publicId: 'demo-placeholder',
      };
    }
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, result) => {
          if (error) return reject(error);
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );
      uploadStream.end(file.buffer);
    });
  }
}
