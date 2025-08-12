import { db } from "@repo/database";
import { authMiddleware } from "../middleware/auth";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { randomUUID } from "crypto";
import { ProductImageService } from '../services/productImageService';

// Initialize image service
const imageService = new ProductImageService();

const productsRouter = new Hono();

// Input validation schemas
const createProductSchema = z.object({
  name: z.string().min(2).max(100),
  genericName: z.string().optional(),
  brandName: z.string().optional(),
  category: z.string().min(1),
  description: z.string().optional(),
  manufacturer: z.string().optional(),
  nafdacNumber: z.string().optional(),
  strength: z.string().optional(),
  dosageForm: z.string().optional(),
  activeIngredient: z.string().optional(),
  retailPrice: z.number().positive(),
  wholesalePrice: z.number().positive().optional(),
  cost: z.number().positive().optional(),
  sku: z.string().min(1),
  barcode: z.string().optional(),
  stockQuantity: z.number().int().min(0).default(0),
  minStockLevel: z.number().int().min(0).default(10),
  maxStockLevel: z.number().int().positive().optional(),
  packSize: z.string().optional(),
  unit: z.string().min(1).default("piece"),
  weight: z.number().positive().optional(),
  dimensions: z.string().optional(),
  isActive: z.boolean().default(true),
  isPrescriptionRequired: z.boolean().default(false),
  isRefrigerated: z.boolean().default(false),
  isControlled: z.boolean().default(false),
  tags: z.string().optional(),
  hasExpiry: z.boolean().default(true),
  shelfLifeMonths: z.number().int().positive().optional(),
  minOrderQuantity: z.number().int().positive().default(1),
  bulkPricing: z.string().optional(),
});

const updateProductSchema = createProductSchema.partial();

const productsQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val)).pipe(z.number().min(1)).default('1'),
  limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(100)).default('20'),
  search: z.string().optional(),
  category: z.string().optional(),
  min_price: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0)).optional(),
  max_price: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0)).optional(),
  prescription_only: z.string().transform(val => val === 'true').optional(),
  in_stock_only: z.string().transform(val => val === 'true').optional()
});

// Get all products with filtering and pagination
productsRouter.get('/', zValidator('query', productsQuerySchema), async (c) => {
  const { page, limit, search, category, min_price, max_price, prescription_only, in_stock_only } = c.req.valid('query');
  
  try {
    const skip = (page - 1) * limit;
    
    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { genericName: { contains: search, mode: 'insensitive' } },
        { brandName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (category) {
      where.category = { equals: category, mode: 'insensitive' };
    }
    
    if (min_price !== undefined) {
      where.retailPrice = { ...where.retailPrice, gte: min_price };
    }
    
    if (max_price !== undefined) {
      where.retailPrice = { ...where.retailPrice, lte: max_price };
    }
    
    if (prescription_only !== undefined) {
      where.isPrescriptionRequired = prescription_only;
    }
    
    if (in_stock_only) {
      where.stockQuantity = { gt: 0 };
    }

    // Get products with pagination
    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          genericName: true,
          brandName: true,
          category: true,
          description: true,
          images: true,
          wholesalePrice: true,
          retailPrice: true,
          stockQuantity: true,
          minOrderQuantity: true,
          isPrescriptionRequired: true,
          nafdacNumber: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      db.product.count({ where })
    ]);

    // Format products with extracted image URLs and refresh if needed
    const formattedProducts = await Promise.all(products.map(async product => {
      let imageUrl = null;
      
      // Handle both JSON string and already parsed arrays
      if (product.images) {
        try {
          let images;
          if (typeof product.images === 'string') {
            images = JSON.parse(product.images);
          } else {
            images = product.images;
          }
          
          if (Array.isArray(images) && images.length > 0) {
            const firstImage = images[0];
            if (firstImage?.url) {
              // Check if URL looks like a Supabase signed URL that might be expired
              if (firstImage.key && firstImage.url.includes('supabase.co')) {
                try {
                  const refreshedUrl = await imageService.refreshImageUrl(firstImage.key);
                  imageUrl = refreshedUrl;
                } catch (refreshError) {
                  console.warn(`Failed to refresh URL for image ${firstImage.key}:`, refreshError);
                  imageUrl = firstImage.url; // Use original if refresh fails
                }
              } else {
                imageUrl = firstImage.url;
              }
            }
          }
        } catch (error) {
          console.error('Error parsing product images for product ID', product.id, ':', error);
        }
      }
      
      return {
        ...product,
        imageUrl,
        image_url: imageUrl, // Add snake_case version for frontend compatibility
      };
    }));

    return c.json({
      products: formattedProducts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return c.json({ error: 'Failed to fetch products' }, 500);
  }
});

// Get single product by ID
productsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  
  try {
    const product = await db.product.findUnique({
      where: { id }
    });
    
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }
    
    // Extract primary image URL from images JSON (improved logic)
    let imageUrl = null;
    if (product.images) {
      try {
        let images;
        if (typeof product.images === 'string') {
          images = JSON.parse(product.images);
        } else {
          images = product.images;
        }
        
        if (Array.isArray(images) && images.length > 0) {
          imageUrl = images[0]?.url || null;
        }
      } catch (error) {
        console.error('Error parsing product images for single product ID', product.id, ':', error);
      }
    }
    
    // Format product with extracted imageUrl
    const formattedProduct = {
      ...product,
      imageUrl, // Add the extracted primary image URL
      image_url: imageUrl, // Also add snake_case version for compatibility
    };
    
    return c.json({ product: formattedProduct });
  } catch (error) {
    console.error('Error fetching product:', error);
    return c.json({ error: 'Failed to fetch product' }, 500);
  }
});

// Search products
productsRouter.get('/search', zValidator('query', z.object({
  q: z.string().min(1),
  limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(50)).default('10')
})), async (c) => {
  const { q, limit } = c.req.valid('query');
  
  try {
    const products = await db.product.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { genericName: { contains: q, mode: 'insensitive' } },
          { brandName: { contains: q, mode: 'insensitive' } },
          { nafdacNumber: { contains: q, mode: 'insensitive' } }
        ]
      },
      take: limit,
      orderBy: [
        { stockQuantity: 'desc' }, // Prioritize in-stock items
        { name: 'asc' }
      ],
      select: {
        id: true,
        name: true,
        genericName: true,
        brandName: true,
        category: true,
        images: true,
        retailPrice: true,
        stockQuantity: true,
        isPrescriptionRequired: true,
        nafdacNumber: true
      }
    });
    
    return c.json({ products });
  } catch (error) {
    console.error('Error searching products:', error);
    return c.json({ error: 'Failed to search products' }, 500);
  }
});

// Create product (admin only)
productsRouter.post('/', authMiddleware, zValidator('json', createProductSchema), async (c) => {
  const session = c.get('session');
  const user = c.get('user');
  
  // Check if user is admin or has permission to create products
  if (user.role !== 'admin') {
    return c.json({ error: 'Insufficient permissions' }, 403);
  }
  
  const data = c.req.valid('json');
  
  try {
    // Check if SKU already exists
    const existingSku = await db.product.findUnique({
      where: { sku: data.sku },
      select: { id: true, sku: true }
    });
    
    if (existingSku) {
      return c.json({ 
        error: 'SKU already exists', 
        details: `A product with SKU "${data.sku}" already exists. Please use a unique SKU.`
      }, 400);
    }
    
    // Generate slug from product name
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    // Check if slug already exists and make it unique
    let uniqueSlug = slug;
    let counter = 1;
    while (await db.product.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }
    
    const product = await db.product.create({
      data: {
        name: data.name,
        genericName: data.genericName,
        brandName: data.brandName,
        category: data.category,
        description: data.description,
        manufacturer: data.manufacturer,
        nafdacNumber: data.nafdacNumber,
        strength: data.strength,
        dosageForm: data.dosageForm,
        activeIngredient: data.activeIngredient,
        retailPrice: data.retailPrice,
        wholesalePrice: data.wholesalePrice,
        cost: data.cost,
        sku: data.sku,
        barcode: data.barcode,
        stockQuantity: data.stockQuantity,
        minStockLevel: data.minStockLevel,
        maxStockLevel: data.maxStockLevel,
        packSize: data.packSize,
        unit: data.unit,
        weight: data.weight,
        dimensions: data.dimensions,
        isActive: data.isActive,
        isPrescriptionRequired: data.isPrescriptionRequired,
        isRefrigerated: data.isRefrigerated,
        isControlled: data.isControlled,
        tags: data.tags,
        hasExpiry: data.hasExpiry,
        shelfLifeMonths: data.shelfLifeMonths,
        minOrderQuantity: data.minOrderQuantity,
        bulkPricing: data.bulkPricing,
        slug: uniqueSlug, // Use the unique slug
      },
      select: {
        id: true,
        name: true,
        genericName: true,
        brandName: true,
        category: true,
        description: true,
        images: true,
        wholesalePrice: true,
        retailPrice: true,
        stockQuantity: true,
        minOrderQuantity: true,
        isPrescriptionRequired: true,
        nafdacNumber: true,
        createdAt: true
      }
    });
    
    return c.json({ product }, 201);
  } catch (error) {
    console.error('Error creating product:', error);
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      return c.json({
        error: `Unique constraint violation: ${field}`,
        details: `The ${field} value already exists. Please use a unique value.`
      }, 400);
    }
    return c.json({ error: 'Failed to create product' }, 500);
  }
});

// Update product (admin only)
productsRouter.put('/:id', authMiddleware, zValidator('json', updateProductSchema), async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  
  if (user.role !== 'admin') {
    return c.json({ error: 'Insufficient permissions' }, 403);
  }
  
  const data = c.req.valid('json');
  
  try {
    const product = await db.product.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        genericName: true,
        brandName: true,
        category: true,
        description: true,
        images: true,
        wholesalePrice: true,
        retailPrice: true,
        stockQuantity: true,
        minOrderQuantity: true,
        isPrescriptionRequired: true,
        nafdacNumber: true,
        updatedAt: true
      }
    });
    
    return c.json({ product });
  } catch (error) {
    if (error.code === 'P2025') {
      return c.json({ error: 'Product not found' }, 404);
    }
    console.error('Error updating product:', error);
    return c.json({ error: 'Failed to update product' }, 500);
  }
});

// Helper function to validate image file
const validateImageFile = (file: File) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
  }
  
  if (file.size > maxSize) {
    throw new Error('File size too large. Maximum size is 5MB.');
  }
};

// Helper function to save image (simplified file system approach for development)
const saveImage = async (file: File, productId: string): Promise<string> => {
  const { writeFile, mkdir } = await import('fs/promises');
  const path = await import('path');
  
  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'products');
  
  try {
    await mkdir(uploadsDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
  
  // Generate unique filename
  const fileExtension = file.name.split('.').pop();
  const fileName = `${productId}-${randomUUID()}.${fileExtension}`;
  const filePath = path.join(uploadsDir, fileName);
  
  // Convert file to buffer and save
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  await writeFile(filePath, buffer);
  
  // Return public URL
  return `/uploads/products/${fileName}`;
};

// Upload multiple product images (admin only) - NEW SUPABASE VERSION
productsRouter.post('/:id/images', authMiddleware, async (c) => {
  const productId = c.req.param('id');
  const user = c.get('user');
  
  if (user.role !== 'admin') {
    return c.json({ error: 'Insufficient permissions' }, 403);
  }
  
  try {
    // Check if product exists
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, images: true, imageUrl: true }
    });
    
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }
    
    // Parse multipart form data
    const formData = await c.req.formData();
    const files = formData.getAll('images') as File[];
    
    if (!files || files.length === 0) {
      return c.json({ error: 'No image files provided' }, 400);
    }
    
    // Upload images to Supabase storage
    const uploadResults = await imageService.uploadMultipleImages(files, productId);
    
    // Get existing images from database
    const existingImages = product.images ? (Array.isArray(product.images) ? product.images : JSON.parse(product.images as string)) : [];
    
    // Merge with new images
    const allImages = [...existingImages, ...uploadResults];
    
    // Update product with new images
    const updatedProduct = await db.product.update({
      where: { id: productId },
      data: { 
        images: allImages,
        imageUrl: allImages[0]?.url || product.imageUrl // Set first image as primary, keep existing if no new images
      },
      select: {
        id: true,
        name: true,
        images: true,
        imageUrl: true,
        updatedAt: true
      }
    });
    
    return c.json({
      message: `${uploadResults.length} image(s) uploaded successfully`,
      images: uploadResults,
      product: {
        ...updatedProduct,
        images: allImages
      }
    });
  } catch (error) {
    console.error('Error uploading product images:', error);
    return c.json({ 
      error: error.message || 'Failed to upload images' 
    }, 500);
  }
});

// Upload single product image (backward compatibility)
productsRouter.post('/:id/image', authMiddleware, async (c) => {
  const productId = c.req.param('id');
  const user = c.get('user');
  
  if (user.role !== 'admin') {
    return c.json({ error: 'Insufficient permissions' }, 403);
  }
  
  try {
    // Check if product exists
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, images: true }
    });
    
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }
    
    // Parse multipart form data
    const formData = await c.req.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return c.json({ error: 'No image file provided' }, 400);
    }
    
    // Upload single image to Supabase
    const uploadResult = await imageService.uploadImage(file, productId);
    
    // Get existing images
    const existingImages = product.images ? (Array.isArray(product.images) ? product.images : JSON.parse(product.images as string)) : [];
    
    // Add new image to the beginning (primary image)
    const allImages = [uploadResult, ...existingImages];
    
    // Update product
    const updatedProduct = await db.product.update({
      where: { id: productId },
      data: { 
        images: allImages,
        imageUrl: uploadResult.url // Set new image as primary
      },
      select: {
        id: true,
        name: true,
        imageUrl: true
      }
    });
    
    return c.json({ 
      message: 'Image uploaded successfully',
      image: uploadResult,
      product: updatedProduct 
    });
  } catch (error) {
    console.error('Error uploading product image:', error);
    return c.json({ error: error.message || 'Failed to upload image' }, 500);
  }
});

// Get product images (public endpoint)
productsRouter.get('/:id/images', async (c) => {
  const productId = c.req.param('id');
  
  try {
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { 
        id: true, 
        name: true, 
        images: true, 
        imageUrl: true 
      }
    });
    
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }
    
    // Parse images from JSON
    const images = product.images ? (Array.isArray(product.images) ? product.images : JSON.parse(product.images as string)) : [];
    
    // Check if images need URL refresh (if they're Supabase signed URLs)
    const refreshedImages = await Promise.all(
      images.map(async (img: any) => {
        try {
          // If URL looks like a Supabase signed URL that might be expired
          if (img.key && img.url && img.url.includes('supabase.co')) {
            const refreshedUrl = await imageService.refreshImageUrl(img.key);
            return { ...img, url: refreshedUrl };
          }
          return img;
        } catch (error) {
          console.warn(`Failed to refresh URL for image ${img.key}:`, error);
          return img; // Return original if refresh fails
        }
      })
    );
    
    return c.json({
      productId: product.id,
      productName: product.name,
      primaryImage: product.imageUrl,
      images: refreshedImages,
      imageCount: refreshedImages.length
    });
  } catch (error) {
    console.error('Error fetching product images:', error);
    return c.json({ error: 'Failed to fetch product images' }, 500);
  }
});

// Delete specific product image (admin only)
productsRouter.delete('/:id/images/:imageKey', authMiddleware, async (c) => {
  const productId = c.req.param('id');
  const imageKey = c.req.param('imageKey');
  const user = c.get('user');
  
  if (user.role !== 'admin') {
    return c.json({ error: 'Insufficient permissions' }, 403);
  }
  
  try {
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { id: true, images: true, imageUrl: true }
    });
    
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }
    
    const images = product.images ? (Array.isArray(product.images) ? product.images : JSON.parse(product.images as string)) : [];
    
    // Find and remove the image by key
    const imageIndex = images.findIndex((img: any) => img.key === imageKey);
    if (imageIndex === -1) {
      return c.json({ error: 'Image not found' }, 404);
    }
    
    const imageToDelete = images[imageIndex];
    
    // Delete from Supabase storage
    try {
      await imageService.deleteImage(imageKey);
    } catch (deleteError) {
      console.warn('Failed to delete image from storage:', deleteError);
      // Continue anyway to remove from database
    }
    
    // Remove from array
    images.splice(imageIndex, 1);
    
    // Update primary image if necessary
    let newPrimaryImage = product.imageUrl;
    if (imageToDelete.url === product.imageUrl) {
      newPrimaryImage = images.length > 0 ? images[0].url : null;
    }
    
    // Update product in database
    const updatedProduct = await db.product.update({
      where: { id: productId },
      data: {
        images: images,
        imageUrl: newPrimaryImage
      },
      select: {
        id: true,
        name: true,
        images: true,
        imageUrl: true
      }
    });
    
    return c.json({
      message: 'Image deleted successfully',
      deletedImage: imageToDelete,
      remainingImages: images,
      product: updatedProduct
    });
  } catch (error) {
    console.error('Error deleting product image:', error);
    return c.json({ error: 'Failed to delete image' }, 500);
  }
});

// Reorder product images (admin only)
productsRouter.put('/:id/images/reorder', authMiddleware, zValidator('json', z.object({
  imageOrder: z.array(z.string()) // Array of image keys in desired order
})), async (c) => {
  const productId = c.req.param('id');
  const { imageOrder } = c.req.valid('json');
  const user = c.get('user');
  
  if (user.role !== 'admin') {
    return c.json({ error: 'Insufficient permissions' }, 403);
  }
  
  try {
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { id: true, images: true }
    });
    
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }
    
    const images = product.images ? (Array.isArray(product.images) ? product.images : JSON.parse(product.images as string)) : [];
    
    // Reorder images based on provided order
    const reorderedImages = imageOrder.map(key => images.find((img: any) => img.key === key)).filter(Boolean);
    
    // Add any images not in the order array to the end
    const remainingImages = images.filter((img: any) => !imageOrder.includes(img.key));
    const finalOrder = [...reorderedImages, ...remainingImages];
    
    // Update product with new order
    const updatedProduct = await db.product.update({
      where: { id: productId },
      data: {
        images: finalOrder,
        imageUrl: finalOrder[0]?.url || null // Set first image as primary
      },
      select: {
        id: true,
        name: true,
        images: true,
        imageUrl: true
      }
    });
    
    return c.json({
      message: 'Images reordered successfully',
      images: finalOrder,
      product: updatedProduct
    });
  } catch (error) {
    console.error('Error reordering product images:', error);
    return c.json({ error: 'Failed to reorder images' }, 500);
  }
});

// Delete product image (admin only) - Legacy endpoint for backward compatibility
productsRouter.delete('/:id/image', authMiddleware, async (c) => {
  const productId = c.req.param('id');
  const user = c.get('user');
  
  if (user.role !== 'admin') {
    return c.json({ error: 'Insufficient permissions' }, 403);
  }
  
  try {
    // Check if product exists
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { id: true, imageUrl: true, images: true }
    });
    
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }
    
    // Clear primary image and all images for legacy compatibility
    const updatedProduct = await db.product.update({
      where: { id: productId },
      data: { 
        imageUrl: null,
        images: []
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        images: true
      }
    });
    
    return c.json({ 
      message: 'All images removed successfully',
      product: updatedProduct 
    });
  } catch (error) {
    console.error('Error removing product images:', error);
    return c.json({ error: 'Failed to remove images' }, 500);
  }
});

// Delete product (admin only)
productsRouter.delete('/:id', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  
  if (user.role !== 'admin') {
    return c.json({ error: 'Insufficient permissions' }, 403);
  }
  
  try {
    // Get product first to check for image
    const product = await db.product.findUnique({
      where: { id },
      select: { id: true, imageUrl: true }
    });
    
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }
    
    // Delete associated image file if exists
    if (product.imageUrl) {
      const path = await import('path');
      const { unlink } = await import('fs/promises');
      
      try {
        const filePath = path.join(process.cwd(), 'public', product.imageUrl);
        await unlink(filePath);
      } catch (fileError) {
        console.warn('Could not delete associated image file:', fileError);
        // Continue with product deletion anyway
      }
    }
    
    // Delete the product
    await db.product.delete({
      where: { id }
    });
    
    return c.json({ message: 'Product deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return c.json({ error: 'Product not found' }, 404);
    }
    console.error('Error deleting product:', error);
    return c.json({ error: 'Failed to delete product' }, 500);
  }
});

export { productsRouter };
