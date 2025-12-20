'use client';

import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { Progress } from '@ui/components/progress';
import { Badge } from '@ui/components/badge';
import { cn } from '@ui/lib';
import {
  Upload,
  X,
  Eye,
  Move,
  AlertCircle,
  CheckCircle,
  Loader2,
  ImageIcon,
  Trash2
} from 'lucide-react';
import Image from 'next/image';
import { useDropzone } from 'react-dropzone';
import {
  adminUIAtom,
  setPreviewImageAtom,
  setUploadProgressAtom,
  setDraggedImageIndexAtom,
  addAdminNotificationAtom,
  type ProductImage,
  type ImageUploadProgress
} from '../lib/admin-store';

interface ProductImageManagerProps {
  productId: string;
  productName: string;
  images: ProductImage[];
  onImagesUpdate?: (images: ProductImage[]) => void;
  className?: string;
}

// API functions
const uploadProductImages = async (productId: string, files: File[]): Promise<{
  images: ProductImage[];
  message: string;
}> => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('images', file);
  });

  const response = await fetch(`/api/products/${productId}/images`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload images');
  }

  return response.json();
};

const deleteProductImage = async (productId: string, imageKey: string): Promise<void> => {
  const response = await fetch(`/api/products/${productId}/images/${imageKey}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete image');
  }
};

const reorderProductImages = async (productId: string, imageOrder: string[]): Promise<{
  images: ProductImage[];
  message: string;
}> => {
  const response = await fetch(`/api/products/${productId}/images/reorder`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imageOrder }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to reorder images');
  }

  return response.json();
};

const refreshImageUrls = async (productId: string): Promise<{
  images: ProductImage[];
  message: string;
}> => {
  const response = await fetch(`/api/admin/products/${productId}/refresh-images`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to refresh image URLs');
  }

  return response.json();
};

export function ProductImageManager({
  productId,
  productName,
  images: initialImages,
  onImagesUpdate,
  className
}: ProductImageManagerProps) {
  const [adminUI, setAdminUI] = useAtom(adminUIAtom);
  const [, setPreviewImage] = useAtom(setPreviewImageAtom);
  const [, setUploadProgress] = useAtom(setUploadProgressAtom);
  const [, setDraggedIndex] = useAtom(setDraggedImageIndexAtom);
  const [, addNotification] = useAtom(addAdminNotificationAtom);
  
  const queryClient = useQueryClient();
  
  // Local state for images (this will be updated from props)
  const images = initialImages || [];

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: ({ files }: { files: File[] }) => uploadProductImages(productId, files),
    onSuccess: (data) => {
      const newImages = [...images, ...data.images];
      onImagesUpdate?.(newImages);
      setUploadProgress([]);
      addNotification({
        type: 'success',
        title: 'Images uploaded',
        message: `Successfully uploaded ${data.images.length} image(s) for ${productName}`
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
    onError: (error) => {
      console.error('Upload failed:', error);
      setUploadProgress(adminUI.uploadProgress.map(p => ({
        ...p,
        status: 'error' as const,
        error: error.message
      })));
      addNotification({
        type: 'error',
        title: 'Upload failed',
        message: `Failed to upload images: ${error.message}`
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (imageKey: string) => deleteProductImage(productId, imageKey),
    onSuccess: (_, deletedKey) => {
      const newImages = images.filter(img => img.key !== deletedKey);
      onImagesUpdate?.(newImages);
      addNotification({
        type: 'success',
        title: 'Image deleted',
        message: 'Product image has been removed successfully'
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
    onError: (error) => {
      console.error('Delete failed:', error);
      addNotification({
        type: 'error',
        title: 'Delete failed',
        message: `Failed to delete image: ${error.message}`
      });
    },
  });

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: (imageOrder: string[]) => reorderProductImages(productId, imageOrder),
    onSuccess: (data) => {
      onImagesUpdate?.(data.images);
      addNotification({
        type: 'success',
        title: 'Images reordered',
        message: 'Product images have been reordered successfully'
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
    onError: (error) => {
      console.error('Reorder failed:', error);
      addNotification({
        type: 'error',
        title: 'Reorder failed',
        message: `Failed to reorder images: ${error.message}`
      });
    },
  });

  // Refresh URLs mutation
  const refreshUrlsMutation = useMutation({
    mutationFn: () => refreshImageUrls(productId),
    onSuccess: (data) => {
      onImagesUpdate?.(data.images);
      addNotification({
        type: 'success',
        title: 'URLs refreshed',
        message: 'Image URLs have been refreshed successfully'
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['product-images', productId] });
    },
    onError: (error) => {
      console.error('Refresh failed:', error);
      addNotification({
        type: 'error',
        title: 'Refresh failed',
        message: `Failed to refresh image URLs: ${error.message}`
      });
    },
  });

  // Dropzone configuration
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Validate files
    const validFiles = acceptedFiles.filter(file => {
      const isValidType = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'].includes(file.type);
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      
      if (!isValidType) {
        alert(`${file.name}: Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.`);
        return false;
      }
      
      if (!isValidSize) {
        alert(`${file.name}: File too large. Maximum size is 10MB.`);
        return false;
      }
      
      return true;
    });

    if (validFiles.length === 0) return;

    // Check total image limit
    if (images.length + validFiles.length > 10) {
      alert('Maximum 10 images allowed per product.');
      return;
    }

    // Initialize upload progress
    const progressItems: ImageUploadProgress[] = validFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const,
    }));
    setUploadProgress(progressItems);

    // Start upload
    uploadMutation.mutate({ files: validFiles });
  }, [images.length, uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif']
    },
    disabled: uploadMutation.isPending,
  });

  // Handle image deletion
  const handleDeleteImage = (imageKey: string) => {
    if (confirm('Are you sure you want to delete this image?')) {
      deleteMutation.mutate(imageKey);
    }
  };

  // Handle drag and drop reordering
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (adminUI.draggedImageIndex === null || adminUI.draggedImageIndex === dropIndex) return;

    const newImages = [...images];
    const draggedImage = newImages[adminUI.draggedImageIndex];
    newImages.splice(adminUI.draggedImageIndex, 1);
    newImages.splice(dropIndex, 0, draggedImage);

    setDraggedIndex(null);
    
    // Save new order to backend
    const imageOrder = newImages.map(img => img.key);
    reorderMutation.mutate(imageOrder);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Product Images</h3>
          <p className="text-sm text-muted-foreground">
            Manage images for {productName} ({images.length}/10 images)
          </p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          {images.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshUrlsMutation.mutate()}
              disabled={refreshUrlsMutation.isPending}
              className="flex-1 md:flex-none"
            >
              {refreshUrlsMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>Refresh URLs</>
              )}
            </Button>
          )}
          <Badge status={images.length === 0 ? "error" : "info"} className="whitespace-nowrap">
            {images.length === 0 ? 'No images' : `${images.length} image${images.length === 1 ? '' : 's'}`}
          </Badge>
        </div>
      </div>

      {/* Upload Area */}
      <Card>
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
            isDragActive ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground/50",
            uploadMutation.isPending && "opacity-50 cursor-not-allowed"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <div className="space-y-2">
            <p className="text-lg font-medium">
              {isDragActive ? 'Drop images here...' : 'Upload product images'}
            </p>
            <p className="text-sm text-muted-foreground">
              Drag and drop images here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Supports JPEG, PNG, WebP, GIF up to 10MB each. Maximum 10 images per product.
            </p>
          </div>
        </div>
      </Card>

      {/* Upload Progress */}
      {adminUI.uploadProgress.length > 0 && (
        <Card className="p-4">
          <h4 className="font-medium mb-3">Uploading Images</h4>
          <div className="space-y-3">
            {adminUI.uploadProgress.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1 mr-2">{item.file.name}</span>
                  <span className="text-gray-500">{formatFileSize(item.file.size)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Progress value={item.status === 'success' ? 100 : 50} className="flex-1" />
                  {item.status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin" />}
                  {item.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {item.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                </div>
                {item.error && (
                  <p className="text-xs text-red-600">{item.error}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Images Grid */}
      {images.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">Current Images</h4>
            <p className="text-sm text-muted-foreground">
              Drag to reorder • First image will be the primary display
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div
                key={image.key}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                className={cn(
                  "relative group bg-gray-50 rounded-lg overflow-hidden aspect-square cursor-move",
                  "border-2 border-transparent hover:border-gray-300 transition-colors",
                  adminUI.draggedImageIndex === index && "opacity-50"
                )}
              >
                {/* Primary badge */}
                {index === 0 && (
                  <Badge className="absolute top-2 left-2 z-10 text-xs" status="info">
                    Primary
                  </Badge>
                )}

                {/* Image */}
                <Image
                  src={image.url}
                  alt={image.originalName}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  unoptimized
                />

                {/* Overlay with actions */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setPreviewImage(image)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="error"
                      onClick={() => handleDeleteImage(image.key)}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Move indicator */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Move className="h-4 w-4 text-white" />
                </div>

                {/* Image info */}
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-2 transform translate-y-full group-hover:translate-y-0 transition-transform">
                  <p className="text-xs truncate">{image.originalName}</p>
                  <p className="text-xs opacity-75">{formatFileSize(image.size)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Image Preview Modal */}
      {adminUI.previewImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-semibold">{adminUI.previewImage.originalName}</h3>
                <p className="text-sm text-gray-600">
                  {formatFileSize(adminUI.previewImage.size)} • {adminUI.previewImage.type}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewImage(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative max-h-[70vh] overflow-auto">
              <Image
                src={adminUI.previewImage.url}
                alt={adminUI.previewImage.originalName}
                width={800}
                height={600}
                className="object-contain w-full h-auto"
                unoptimized
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
