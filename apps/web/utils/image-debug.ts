'use client';

export interface ImageDebugInfo {
  src: string;
  productId?: string;
  productName?: string;
  isValid: boolean;
  isExpired?: boolean;
  isSupabase: boolean;
  error?: string;
}

/**
 * Debug utility to check if image URLs are valid and working
 */
export class ImageDebugger {
  static async checkImageUrl(src: string, productId?: string, productName?: string): Promise<ImageDebugInfo> {
    const debugInfo: ImageDebugInfo = {
      src,
      productId,
      productName,
      isValid: false,
      isSupabase: src.includes('supabase.co'),
    };

    try {
      // Test if image loads
      const response = await fetch(src, { 
        method: 'HEAD',
        mode: 'no-cors' // Avoid CORS issues for testing
      });
      
      debugInfo.isValid = response.ok;
      
      if (!response.ok) {
        debugInfo.error = `HTTP ${response.status}: ${response.statusText}`;
        
        // Check if it looks like an expired signed URL
        if (response.status === 403 && debugInfo.isSupabase) {
          debugInfo.isExpired = true;
          debugInfo.error += ' (Possibly expired signed URL)';
        }
      }
    } catch (error) {
      debugInfo.isValid = false;
      debugInfo.error = error instanceof Error ? error.message : 'Unknown error';
      
      // Network errors might indicate CORS or expired URLs
      if (debugInfo.isSupabase) {
        debugInfo.isExpired = true;
      }
    }

    return debugInfo;
  }

  static async testImageLoad(src: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
      
      // Timeout after 10 seconds
      setTimeout(() => resolve(false), 10000);
    });
  }

  static logImageError(debugInfo: ImageDebugInfo): void {
    console.group(`🖼️ Image Debug - ${debugInfo.productName || debugInfo.productId || 'Unknown Product'}`);
    console.log('URL:', debugInfo.src);
    console.log('Is Supabase:', debugInfo.isSupabase);
    console.log('Is Valid:', debugInfo.isValid);
    
    if (debugInfo.isExpired) {
      console.warn('⚠️ URL appears to be expired (Supabase signed URL)');
    }
    
    if (debugInfo.error) {
      console.error('Error:', debugInfo.error);
    }
    
    if (debugInfo.isSupabase && !debugInfo.isValid) {
      console.info('💡 Solution: Refresh the image URLs via admin panel');
    }
    
    console.groupEnd();
  }

  /**
   * Comprehensive image debugging for a product
   */
  static async debugProductImages(product: any): Promise<ImageDebugInfo[]> {
    const results: ImageDebugInfo[] = [];

    // Check primary image URL
    if (product.image_url || product.imageUrl) {
      const primaryUrl = product.image_url || product.imageUrl;
      const debugInfo = await this.checkImageUrl(primaryUrl, product.id, product.name);
      results.push(debugInfo);
      
      if (!debugInfo.isValid) {
        this.logImageError(debugInfo);
      }
    }

    // Check images array
    if (product.images) {
      try {
        const images = typeof product.images === 'string' 
          ? JSON.parse(product.images) 
          : product.images;

        if (Array.isArray(images)) {
          for (const [index, image] of images.entries()) {
            const imageUrl = typeof image === 'string' ? image : image?.url;
            if (imageUrl) {
              const debugInfo = await this.checkImageUrl(
                imageUrl, 
                product.id, 
                `${product.name} - Image ${index + 1}`
              );
              results.push(debugInfo);
              
              if (!debugInfo.isValid) {
                this.logImageError(debugInfo);
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to parse images JSON:', error);
      }
    }

    return results;
  }

  /**
   * Quick fix suggestions for common image issues
   */
  static getFixSuggestions(debugInfo: ImageDebugInfo[]): string[] {
    const suggestions: string[] = [];
    const hasExpiredUrls = debugInfo.some(info => info.isExpired);
    const hasInvalidUrls = debugInfo.some(info => !info.isValid);
    const hasSupabaseUrls = debugInfo.some(info => info.isSupabase);

    if (hasExpiredUrls) {
      suggestions.push('🔄 Refresh expired Supabase image URLs via admin panel');
    }

    if (hasInvalidUrls && hasSupabaseUrls) {
      suggestions.push('🔧 Check Supabase project status and storage bucket permissions');
      suggestions.push('🌐 Verify Next.js image domains configuration');
    }

    if (hasInvalidUrls && !hasSupabaseUrls) {
      suggestions.push('📁 Check if image files exist on the server');
      suggestions.push('🔗 Verify image URLs are correct and accessible');
    }

    if (debugInfo.length === 0) {
      suggestions.push('📷 No images found - consider adding product images');
    }

    return suggestions;
  }
}

/**
 * Hook for debugging images in React components
 */
export function useImageDebugger() {
  const debugProduct = async (product: any) => {
    const debugInfo = await ImageDebugger.debugProductImages(product);
    const suggestions = ImageDebugger.getFixSuggestions(debugInfo);
    
    console.group(`🔍 Product Image Debug Report - ${product.name}`);
    console.table(debugInfo.map(info => ({
      URL: info.src.substring(0, 50) + '...',
      Valid: info.isValid ? '✅' : '❌',
      Supabase: info.isSupabase ? '☁️' : '📁',
      Expired: info.isExpired ? '⏰' : '✓',
      Error: info.error || 'None'
    })));
    
    if (suggestions.length > 0) {
      console.group('💡 Fix Suggestions:');
      suggestions.forEach(suggestion => console.info(suggestion));
      console.groupEnd();
    }
    
    console.groupEnd();
    
    return { debugInfo, suggestions };
  };

  return { debugProduct };
}
