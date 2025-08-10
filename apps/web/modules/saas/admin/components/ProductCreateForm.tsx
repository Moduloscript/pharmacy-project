'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAtom } from 'jotai';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { Textarea } from '@ui/components/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/components/select';
import { Checkbox } from '@ui/components/checkbox';
import { Separator } from '@ui/components/separator';
import { cn } from '@ui/lib';
import {
  Save,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Loader2,
  Package,
  DollarSign,
  FileText,
  Upload,
  X,
  ImageIcon,
} from 'lucide-react';
import Link from 'next/link';
import {
  adminUIAtom,
  productFormStateAtom,
  setSaveStatusAtom,
  setProductFormStateAtom,
  addAdminNotificationAtom,
  type ImageUploadProgress,
} from '../lib/admin-store';
import { useDropzone } from 'react-dropzone';

// Validation schema
const productSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  genericName: z.string().optional(),
  brandName: z.string().optional(),
  category: z.string().min(1, 'Please select a category'),
  description: z.string().optional(),
  manufacturer: z.string().optional(),
  nafdacNumber: z.string().optional(),
  strength: z.string().optional(),
  dosageForm: z.string().optional(),
  activeIngredient: z.string().optional(),
  retailPrice: z.number().positive('Retail price must be positive'),
  wholesalePrice: z.number().positive('Wholesale price must be positive').optional(),
  cost: z.number().positive('Cost must be positive').optional(),
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional(),
  stockQuantity: z.number().int().min(0, 'Stock quantity must be non-negative'),
  minStockLevel: z.number().int().min(0, 'Minimum stock level must be non-negative'),
  maxStockLevel: z.number().int().positive('Maximum stock level must be positive').optional(),
  packSize: z.string().optional(),
  unit: z.string().min(1, 'Unit is required'),
  weight: z.number().positive('Weight must be positive').optional(),
  dimensions: z.string().optional(),
  isActive: z.boolean(),
  isPrescriptionRequired: z.boolean(),
  isRefrigerated: z.boolean(),
  isControlled: z.boolean(),
  tags: z.string().optional(),
  hasExpiry: z.boolean(),
  shelfLifeMonths: z.number().int().positive('Shelf life must be positive').optional(),
  minOrderQuantity: z.number().int().positive('Minimum order quantity must be positive'),
  bulkPricing: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

// API functions
const createProduct = async (data: ProductFormData) => {
  const response = await fetch('/api/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    // Provide more detailed error messages
    if (error.error === 'SKU already exists') {
      throw new Error(`SKU "${data.sku}" is already used by another product. Please choose a unique SKU.`);
    }
    if (error.error?.includes('Unique constraint violation')) {
      throw new Error(error.details || error.error);
    }
    throw new Error(error.error || error.details || 'Failed to create product');
  }

  return response.json();
};

// Constants
const PRODUCT_CATEGORIES = [
  { value: 'PAIN_RELIEF', label: 'Pain Relief' },
  { value: 'ANTIBIOTICS', label: 'Antibiotics' },
  { value: 'VITAMINS', label: 'Vitamins' },
  { value: 'SUPPLEMENTS', label: 'Supplements' },
  { value: 'BABY_CARE', label: 'Baby Care' },
  { value: 'FIRST_AID', label: 'First Aid' },
  { value: 'DIABETES_CARE', label: 'Diabetes Care' },
  { value: 'HEART_HEALTH', label: 'Heart Health' },
  { value: 'RESPIRATORY', label: 'Respiratory' },
  { value: 'DIGESTIVE', label: 'Digestive' },
  { value: 'SKIN_CARE', label: 'Skin Care' },
  { value: 'EYE_CARE', label: 'Eye Care' },
  { value: 'CONTRACEPTIVES', label: 'Contraceptives' },
  { value: 'PRESCRIPTION', label: 'Prescription' },
  { value: 'OTHER', label: 'Other' },
];

const DOSAGE_FORMS = [
  'Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Ointment', 
  'Drops', 'Spray', 'Inhaler', 'Patch', 'Suppository', 'Other'
];

const UNITS = [
  'piece', 'pack', 'bottle', 'box', 'tube', 'sachet', 'vial', 'ampoule'
];

export function ProductCreateForm() {
  const [adminUI] = useAtom(adminUIAtom);
  const [formState] = useAtom(productFormStateAtom);
  const [, setSaveStatus] = useAtom(setSaveStatusAtom);
  const [, setFormState] = useAtom(setProductFormStateAtom);
  const [, addNotification] = useAtom(addAdminNotificationAtom);
  
  // Local state for image handling
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<ImageUploadProgress[]>([]);
  
  const router = useRouter();
  const queryClient = useQueryClient();

  // Image handling functions
  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setSelectedImages(newImages);
    setImagePreviews(newPreviews);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Validate and filter files
    const validFiles = acceptedFiles.filter(file => {
      const isValidType = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'].includes(file.type);
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      
      if (!isValidType) {
        addNotification({
          type: 'error',
          title: 'Invalid file type',
          message: `${file.name}: Only JPEG, PNG, WebP, and GIF images are allowed.`
        });
        return false;
      }
      
      if (!isValidSize) {
        addNotification({
          type: 'error',
          title: 'File too large',
          message: `${file.name}: File size must be 10MB or less.`
        });
        return false;
      }
      
      return true;
    });

    if (validFiles.length > 0) {
      const newImages = [...selectedImages, ...validFiles].slice(0, 5); // Max 5 images
      setSelectedImages(newImages);
      
      // Create preview URLs
      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreviews(prev => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  }, [selectedImages, addNotification]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true,
    maxFiles: 5
  });

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isValid },
    setValue,
    watch,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      genericName: '',
      brandName: '',
      category: '',
      description: '',
      manufacturer: '',
      nafdacNumber: '',
      strength: '',
      dosageForm: '',
      activeIngredient: '',
      retailPrice: 0,
      wholesalePrice: undefined,
      cost: undefined,
      sku: '',
      barcode: '',
      stockQuantity: 0,
      minStockLevel: 10,
      maxStockLevel: undefined,
      packSize: '',
      unit: 'piece',
      weight: undefined,
      dimensions: '',
      isActive: true,
      isPrescriptionRequired: false,
      isRefrigerated: false,
      isControlled: false,
      tags: '',
      hasExpiry: true,
      shelfLifeMonths: undefined,
      minOrderQuantity: 1,
      bulkPricing: '',
    },
  });

  // Sync form state with Jotai
  useEffect(() => {
    setFormState({
      isDirty,
      isValid,
      errors: Object.keys(errors).reduce((acc, key) => {
        acc[key] = errors[key]?.message || '';
        return acc;
      }, {} as Record<string, string>),
    });
  }, [isDirty, isValid, errors, setFormState]);

  // Upload images after product creation
  const uploadImagesAfterCreation = async (productId: string) => {
    if (selectedImages.length === 0) return;
    
    try {
      const formData = new FormData();
      selectedImages.forEach((file) => {
        formData.append('images', file);
      });
      
      const response = await fetch(`/api/products/${productId}/images`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload images');
      }
      
      addNotification({
        type: 'success',
        title: 'Images uploaded',
        message: `Successfully uploaded ${selectedImages.length} image(s)`
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Image upload failed',
        message: 'Product was created but images failed to upload. You can add them later.'
      });
    }
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createProduct,
    onMutate: () => {
      setSaveStatus('saving');
    },
    onSuccess: async (data) => {
      setSaveStatus('success');
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'inventory', 'products'] });
      
      addNotification({
        type: 'success',
        title: 'Product created',
        message: `${data.product.name} has been created successfully`
      });
      
      // Upload images if any were selected
      if (selectedImages.length > 0) {
        await uploadImagesAfterCreation(data.product.id);
      }
      
      // Redirect to edit page after 2 seconds
      setTimeout(() => {
        if (selectedImages.length > 0) {
          router.push(`/app/admin/products/${data.product.id}/edit?tab=images`);
        } else {
          router.push('/app/admin/inventory');
        }
      }, 2000);
    },
    onError: (error) => {
      setSaveStatus('error');
      addNotification({
        type: 'error',
        title: 'Failed to create product',
        message: error.message
      });
      
      setTimeout(() => setSaveStatus('idle'), 5000);
    },
  });

  // Form submission
  const onSubmit = async (data: ProductFormData) => {
    createMutation.mutate(data);
  };

  // Format currency for display with proper validation
  const formatCurrency = (amount: number | undefined | null) => {
    // Handle invalid, null, undefined, or NaN values
    if (amount == null || isNaN(amount) || !isFinite(amount)) {
      return '₦0.00';
    }
    
    // Ensure it's a positive number
    const validAmount = Math.max(0, Number(amount));
    
    try {
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
      }).format(validAmount);
    } catch (error) {
      return `₦${validAmount.toFixed(2)}`; // Fallback formatting
    }
  };
  
  // Helper function to safely get and validate numeric values from form
  const getNumericValue = (fieldName: string): number => {
    const value = watch(fieldName);
    if (value == null || isNaN(value) || !isFinite(value)) {
      return 0;
    }
    return Number(value);
  };
  
  // Helper function to check if a field has a valid positive value
  const hasValidPositiveValue = (fieldName: string): boolean => {
    const value = getNumericValue(fieldName);
    return value > 0;
  };

  const isCreating = adminUI.saveStatus === 'saving';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/app/admin/inventory">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Inventory
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Create New Product</h2>
            <p className="text-sm text-gray-600">Add a new product to your pharmacy inventory</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Create Status Indicator */}
          {adminUI.saveStatus === 'saving' && (
            <div className="flex items-center space-x-2 text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Creating...</span>
            </div>
          )}
          {adminUI.saveStatus === 'success' && (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Product created! Redirecting...</span>
            </div>
          )}
          {adminUI.saveStatus === 'error' && (
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Creation failed</span>
            </div>
          )}
          
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={!formState.isDirty || !formState.isValid || isCreating}
            className="min-w-[120px]"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Product
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <FileText className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Basic Information</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Product Name */}
            <div>
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                {...register('name')}
                className={errors.name ? 'border-red-500' : ''}
                placeholder="Enter product name"
              />
              {errors.name && (
                <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* Generic Name */}
            <div>
              <Label htmlFor="genericName">Generic Name</Label>
              <Input 
                id="genericName" 
                {...register('genericName')} 
                placeholder="Enter generic name"
              />
            </div>

            {/* Brand Name */}
            <div>
              <Label htmlFor="brandName">Brand Name</Label>
              <Input 
                id="brandName" 
                {...register('brandName')} 
                placeholder="Enter brand name"
              />
            </div>

            {/* Category */}
            <div>
              <Label>Category *</Label>
              <Select
                value={watch('category')}
                onValueChange={(value) => setValue('category', value, { shouldDirty: true })}
              >
                <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-red-600 mt-1">{errors.category.message}</p>
              )}
            </div>

            {/* Manufacturer */}
            <div>
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Input 
                id="manufacturer" 
                {...register('manufacturer')} 
                placeholder="Enter manufacturer"
              />
            </div>

            {/* NAFDAC Number */}
            <div>
              <Label htmlFor="nafdacNumber">NAFDAC Registration Number</Label>
              <Input 
                id="nafdacNumber" 
                {...register('nafdacNumber')} 
                placeholder="Enter NAFDAC number"
              />
            </div>

            {/* Strength */}
            <div>
              <Label htmlFor="strength">Strength (mg/ml)</Label>
              <Input 
                id="strength" 
                {...register('strength')} 
                placeholder="e.g., 500mg" 
              />
            </div>

            {/* Dosage Form */}
            <div>
              <Label>Dosage Form</Label>
              <Select
                value={watch('dosageForm') || ''}
                onValueChange={(value) => setValue('dosageForm', value, { shouldDirty: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select dosage form" />
                </SelectTrigger>
                <SelectContent>
                  {DOSAGE_FORMS.map((form) => (
                    <SelectItem key={form} value={form}>
                      {form}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              rows={4}
              placeholder="Product description, uses, directions..."
            />
          </div>

          {/* Product Settings */}
          <div className="mt-6">
            <Label className="text-base font-medium">Product Settings</Label>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPrescriptionRequired"
                  checked={watch('isPrescriptionRequired')}
                  onCheckedChange={(checked) => 
                    setValue('isPrescriptionRequired', !!checked, { shouldDirty: true })
                  }
                />
                <Label htmlFor="isPrescriptionRequired">Prescription required</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isRefrigerated"
                  checked={watch('isRefrigerated')}
                  onCheckedChange={(checked) => 
                    setValue('isRefrigerated', !!checked, { shouldDirty: true })
                  }
                />
                <Label htmlFor="isRefrigerated">Requires refrigeration</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isControlled"
                  checked={watch('isControlled')}
                  onCheckedChange={(checked) => 
                    setValue('isControlled', !!checked, { shouldDirty: true })
                  }
                />
                <Label htmlFor="isControlled">Controlled substance</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={watch('isActive')}
                  onCheckedChange={(checked) => 
                    setValue('isActive', !!checked, { shouldDirty: true })
                  }
                />
                <Label htmlFor="isActive">Product is active</Label>
              </div>
            </div>
          </div>
        </Card>

        {/* Inventory Information */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Package className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold">Inventory Information</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* SKU */}
            <div>
              <Label htmlFor="sku">SKU (Stock Keeping Unit) *</Label>
              <Input
                id="sku"
                {...register('sku')}
                className={errors.sku ? 'border-red-500' : ''}
                placeholder="Enter SKU"
              />
              {errors.sku && (
                <p className="text-sm text-red-600 mt-1">{errors.sku.message}</p>
              )}
            </div>

            {/* Barcode */}
            <div>
              <Label htmlFor="barcode">Barcode</Label>
              <Input 
                id="barcode" 
                {...register('barcode')} 
                placeholder="Enter barcode"
              />
            </div>

            {/* Initial Stock */}
            <div>
              <Label htmlFor="stockQuantity">Initial Stock Quantity *</Label>
              <Input
                id="stockQuantity"
                type="number"
                min="0"
                {...register('stockQuantity', { valueAsNumber: true })}
                className={errors.stockQuantity ? 'border-red-500' : ''}
              />
              {errors.stockQuantity && (
                <p className="text-sm text-red-600 mt-1">{errors.stockQuantity.message}</p>
              )}
            </div>

            {/* Minimum Stock Level */}
            <div>
              <Label htmlFor="minStockLevel">Minimum Stock Level *</Label>
              <Input
                id="minStockLevel"
                type="number"
                min="0"
                {...register('minStockLevel', { valueAsNumber: true })}
                className={errors.minStockLevel ? 'border-red-500' : ''}
              />
              {errors.minStockLevel && (
                <p className="text-sm text-red-600 mt-1">{errors.minStockLevel.message}</p>
              )}
            </div>

            {/* Maximum Stock Level */}
            <div>
              <Label htmlFor="maxStockLevel">Maximum Stock Level</Label>
              <Input
                id="maxStockLevel"
                type="number"
                min="0"
                {...register('maxStockLevel', { valueAsNumber: true })}
              />
            </div>

            {/* Unit */}
            <div>
              <Label>Unit *</Label>
              <Select
                value={watch('unit')}
                onValueChange={(value) => setValue('unit', value, { shouldDirty: true })}
              >
                <SelectTrigger className={errors.unit ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.unit && (
                <p className="text-sm text-red-600 mt-1">{errors.unit.message}</p>
              )}
            </div>

            {/* Pack Size */}
            <div>
              <Label htmlFor="packSize">Pack Size</Label>
              <Input 
                id="packSize" 
                {...register('packSize')} 
                placeholder="e.g., 10 tablets" 
              />
            </div>

            {/* Weight */}
            <div>
              <Label htmlFor="weight">Weight (grams)</Label>
              <Input
                id="weight"
                type="number"
                step="0.01"
                min="0"
                {...register('weight', { valueAsNumber: true })}
              />
            </div>

            {/* Minimum Order Quantity */}
            <div>
              <Label htmlFor="minOrderQuantity">Minimum Order Quantity *</Label>
              <Input
                id="minOrderQuantity"
                type="number"
                min="1"
                {...register('minOrderQuantity', { valueAsNumber: true })}
                className={errors.minOrderQuantity ? 'border-red-500' : ''}
              />
              {errors.minOrderQuantity && (
                <p className="text-sm text-red-600 mt-1">{errors.minOrderQuantity.message}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Pricing Information */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <DollarSign className="h-5 w-5 text-yellow-600" />
            <h3 className="text-lg font-semibold">Pricing Information</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Retail Price */}
            <div>
              <Label htmlFor="retailPrice">Retail Price (₦) *</Label>
              <Input
                id="retailPrice"
                type="number"
                step="0.01"
                min="0"
                {...register('retailPrice', { valueAsNumber: true })}
                className={errors.retailPrice ? 'border-red-500' : ''}
              />
              {errors.retailPrice && (
                <p className="text-sm text-red-600 mt-1">{errors.retailPrice.message}</p>
              )}
              {hasValidPositiveValue('retailPrice') && (
                <p className="text-xs text-gray-600 mt-1">
                  {formatCurrency(getNumericValue('retailPrice'))}
                </p>
              )}
            </div>

            {/* Wholesale Price */}
            <div>
              <Label htmlFor="wholesalePrice">Wholesale Price (₦)</Label>
              <Input
                id="wholesalePrice"
                type="number"
                step="0.01"
                min="0"
                {...register('wholesalePrice', { valueAsNumber: true })}
              />
              {hasValidPositiveValue('wholesalePrice') && (
                <p className="text-xs text-gray-600 mt-1">
                  {formatCurrency(getNumericValue('wholesalePrice'))}
                </p>
              )}
            </div>

            {/* Cost Price */}
            <div>
              <Label htmlFor="cost">Cost Price (₦)</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                min="0"
                {...register('cost', { valueAsNumber: true })}
              />
              {hasValidPositiveValue('cost') && (
                <p className="text-xs text-gray-600 mt-1">
                  {formatCurrency(getNumericValue('cost'))}
                </p>
              )}
            </div>
          </div>

          {/* Bulk Pricing */}
          <div className="mt-6">
            <Label htmlFor="bulkPricing">Bulk Pricing Rules</Label>
            <Textarea
              id="bulkPricing"
              {...register('bulkPricing')}
              rows={3}
              placeholder="e.g., 10+ units: 10% discount, 50+ units: 15% discount"
            />
          </div>

          {/* Pricing Summary */}
          {(hasValidPositiveValue('retailPrice') || hasValidPositiveValue('wholesalePrice') || hasValidPositiveValue('cost')) && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Pricing Summary</h4>
              <div className="space-y-2 text-sm">
                {hasValidPositiveValue('cost') && hasValidPositiveValue('retailPrice') && (
                  <div className="flex justify-between">
                    <span>Retail Margin:</span>
                    <span className="font-medium text-green-600">
                      {(() => {
                        const cost = getNumericValue('cost');
                        const retail = getNumericValue('retailPrice');
                        if (cost > 0) {
                          const margin = ((retail - cost) / cost) * 100;
                          return isFinite(margin) ? `${margin.toFixed(1)}%` : 'N/A';
                        }
                        return 'N/A';
                      })()}
                    </span>
                  </div>
                )}
                {hasValidPositiveValue('cost') && hasValidPositiveValue('wholesalePrice') && (
                  <div className="flex justify-between">
                    <span>Wholesale Margin:</span>
                    <span className="font-medium text-blue-600">
                      {(() => {
                        const cost = getNumericValue('cost');
                        const wholesale = getNumericValue('wholesalePrice');
                        if (cost > 0) {
                          const margin = ((wholesale - cost) / cost) * 100;
                          return isFinite(margin) ? `${margin.toFixed(1)}%` : 'N/A';
                        }
                        return 'N/A';
                      })()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Product Images */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <ImageIcon className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold">Product Images (Optional)</h3>
          </div>
          
          <div className="space-y-4">
            {/* Upload Area */}
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400",
                selectedImages.length >= 5 && "opacity-50 cursor-not-allowed"
              )}
            >
              <input {...getInputProps()} disabled={selectedImages.length >= 5} />
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <div className="space-y-2">
                <p className="text-lg font-medium">
                  {isDragActive 
                    ? 'Drop images here...' 
                    : selectedImages.length >= 5 
                      ? 'Maximum 5 images reached' 
                      : 'Select product images'
                  }
                </p>
                <p className="text-sm text-gray-600">
                  {selectedImages.length < 5 
                    ? 'Drag and drop images here, or click to browse' 
                    : 'Remove images to add more'
                  }
                </p>
                <p className="text-xs text-gray-500">
                  JPEG, PNG, WebP, GIF up to 10MB each. Maximum 5 images.
                </p>
                <p className="text-xs text-blue-600 font-medium">
                  Note: Images will be uploaded after the product is created
                </p>
              </div>
            </div>
            
            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-3">Selected Images ({imagePreviews.length}/5)</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 p-0"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-1 truncate">
                        {selectedImages[index]?.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <div className="text-right">
            {selectedImages.length > 0 && (
              <p className="text-sm text-gray-600 mb-2">
                {selectedImages.length} image(s) selected - will be uploaded after product creation
              </p>
            )}
            <Button
              type="submit"
              disabled={!formState.isDirty || !formState.isValid || isCreating}
              size="lg"
              className="min-w-[200px]"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {selectedImages.length > 0 ? 'Creating & Uploading...' : 'Creating Product...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {selectedImages.length > 0 ? `Create Product + ${selectedImages.length} Images` : 'Create Product'}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
