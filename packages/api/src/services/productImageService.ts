import { getSignedUploadUrl, getSignedUrl } from '@repo/storage';
import { config } from '@repo/config';
import { randomUUID } from 'crypto';
import { logger } from '@repo/logs';

interface ImageUploadResult {
  url: string;
  key: string;
  originalName: string;
  size: number;
  type: string;
}

export class ProductImageService {
  private bucket = config.storage.bucketNames.productImages;

  /**
   * Upload a single image for a product
   */
  async uploadImage(file: File, productId: string): Promise<ImageUploadResult> {
    try {
      // Validate file
      this.validateImageFile(file);
      
      // Generate unique key
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const key = `products/${productId}/${randomUUID()}.${fileExtension}`;
      
      logger.info(`Uploading image for product ${productId}`, { key, size: file.size });
      
      // Get signed upload URL
      const uploadUrl = await getSignedUploadUrl(key, {
        bucket: this.bucket
      });
      
      // Upload file directly to Supabase
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Failed to upload image to Supabase', { 
          status: response.status, 
          error: errorText,
          key 
        });
        throw new Error(`Failed to upload image to storage: ${response.status} ${errorText}`);
      }
      
      // Generate public URL (7 days max per AWS S3 limits)
      const publicUrl = await getSignedUrl(key, {
        bucket: this.bucket,
        expiresIn: 60 * 60 * 24 * 7 // 7 days (maximum allowed)
      });
      
      logger.info(`Successfully uploaded image for product ${productId}`, { key, url: publicUrl });
      
      return { 
        url: publicUrl, 
        key,
        originalName: file.name,
        size: file.size,
        type: file.type
      };
    } catch (error) {
      logger.error('Error in uploadImage', { error, productId });
      throw error;
    }
  }

  /**
   * Upload multiple images for a product
   */
  async uploadMultipleImages(files: File[], productId: string): Promise<ImageUploadResult[]> {
    if (!files || files.length === 0) {
      throw new Error('No files provided for upload');
    }

    if (files.length > 10) {
      throw new Error('Maximum 10 images allowed per product');
    }

    try {
      logger.info(`Uploading ${files.length} images for product ${productId}`);
      
      // Upload all files in parallel
      const uploadPromises = files.map(file => this.uploadImage(file, productId));
      const results = await Promise.allSettled(uploadPromises);
      
      // Handle results
      const successful: ImageUploadResult[] = [];
      const failed: string[] = [];
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successful.push(result.value);
        } else {
          failed.push(`File ${index + 1}: ${result.reason.message}`);
          logger.error(`Failed to upload file ${index + 1}`, { error: result.reason });
        }
      });
      
      if (failed.length > 0) {
        logger.warn(`Some images failed to upload for product ${productId}`, { 
          successful: successful.length, 
          failed: failed.length,
          errors: failed 
        });
        
        // If all failed, throw error
        if (successful.length === 0) {
          throw new Error(`All image uploads failed: ${failed.join(', ')}`);
        }
        
        // If some failed, log warning but continue
        logger.warn(`Partial upload success for product ${productId}`, { 
          successful: successful.length, 
          failed: failed.length 
        });
      }
      
      return successful;
    } catch (error) {
      logger.error('Error in uploadMultipleImages', { error, productId });
      throw error;
    }
  }

  /**
   * Delete an image from Supabase storage
   * Note: This would require implementing delete functionality in the storage service
   */
  async deleteImage(key: string): Promise<void> {
    try {
      logger.info(`Deleting image with key: ${key}`);
      
      // TODO: Implement delete functionality in storage service
      // For now, we'll log this as a placeholder
      logger.warn('Image deletion not yet implemented in storage service', { key });
      
      // When implemented, this would look like:
      // await deleteObject(key, { bucket: this.bucket });
      
    } catch (error) {
      logger.error('Error in deleteImage', { error, key });
      throw error;
    }
  }

  /**
   * Generate a fresh signed URL for an existing image
   */
  async refreshImageUrl(key: string): Promise<string> {
    try {
      const publicUrl = await getSignedUrl(key, {
        bucket: this.bucket,
        expiresIn: 60 * 60 * 24 * 7 // 7 days (maximum allowed)
      });
      
      return publicUrl;
    } catch (error) {
      logger.error('Error refreshing image URL', { error, key });
      throw new Error(`Failed to refresh URL for image: ${key}`);
    }
  }

  /**
   * Validate image file before upload
   */
  private validateImageFile(file: File): void {
    const allowedTypes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/webp',
      'image/gif' // Added GIF support for product animations
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const minSize = 1024; // 1KB minimum
    
    if (!file.type || !allowedTypes.includes(file.type)) {
      throw new Error(
        `Invalid file type: ${file.type}. Only JPEG, PNG, WebP, and GIF images are allowed.`
      );
    }
    
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      throw new Error(
        `File size too large: ${(file.size / (1024 * 1024)).toFixed(2)}MB. Maximum size is ${maxSizeMB}MB.`
      );
    }
    
    if (file.size < minSize) {
      throw new Error(
        `File size too small: ${file.size} bytes. Minimum size is ${minSize} bytes.`
      );
    }

    // Additional validation for Nigerian pharmacy context
    if (!file.name || file.name.trim() === '') {
      throw new Error('File must have a valid name');
    }

    // Check for potentially malicious file extensions
    const fileName = file.name.toLowerCase();
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
    if (dangerousExtensions.some(ext => fileName.includes(ext))) {
      throw new Error('File contains potentially dangerous content');
    }
  }

  /**
   * Get storage usage statistics for a product
   */
  async getProductStorageStats(productId: string): Promise<{
    imageCount: number;
    totalSize: number;
    averageSize: number;
  }> {
    try {
      // This would require implementing list functionality in storage service
      // For now, return placeholder data
      logger.info(`Getting storage stats for product ${productId}`);
      
      return {
        imageCount: 0,
        totalSize: 0,
        averageSize: 0
      };
    } catch (error) {
      logger.error('Error getting storage stats', { error, productId });
      throw error;
    }
  }

  /**
   * Optimize image metadata for Nigerian pharmacy products
   */
  private generateImageMetadata(file: File, productId: string): Record<string, string> {
    return {
      productId,
      uploadedAt: new Date().toISOString(),
      originalName: file.name,
      size: file.size.toString(),
      type: file.type,
      // Nigerian specific metadata
      country: 'Nigeria',
      currency: 'NGN',
      compliance: 'NAFDAC-ready' // For pharmaceutical products
    };
  }
}
