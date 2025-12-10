'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Badge } from '@ui/components/badge';
import { Separator } from '@ui/components/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/components/tabs';
import { cn } from '@ui/lib';
import {
  Save,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Loader2,
  Package,
  DollarSign,
  Image as ImageIcon,
  FileText,
  Settings
} from 'lucide-react';
import Link from 'next/link';
import { ProductImageManager } from './ProductImageManager';
import { BulkPricingEditor } from './BulkPricingEditor';

// Validation schema
// Note: react-hook-form returns NaN for empty number inputs when valueAsNumber is used.
// We preprocess optional numeric fields to undefined when blank/NaN so validation doesn’t block.
const toUndefinedIfBlankOrNaN = (v: unknown) => {
  if (v === '' || v === null || v === undefined) return undefined;
  if (typeof v === 'number' && Number.isNaN(v)) return undefined;
  return v;
};

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
  // Allow 0 and above for prices; preprocess optional numbers
  retailPrice: z
    .preprocess((v) => (typeof v === 'number' && Number.isNaN(v) ? 0 : v), z.number().min(0, 'Retail price must be 0 or more')),
  wholesalePrice: z
    .preprocess(toUndefinedIfBlankOrNaN, z.number().min(0, 'Wholesale price must be 0 or more'))
    .optional(),
  cost: z
    .preprocess(toUndefinedIfBlankOrNaN, z.number().min(0, 'Cost must be 0 or more'))
    .optional(),
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional(),
  stockQuantity: z.number().int().min(0, 'Stock quantity must be non-negative'),
  minStockLevel: z.number().int().min(0, 'Minimum stock level must be non-negative'),
  maxStockLevel: z
    .preprocess(toUndefinedIfBlankOrNaN, z.number().int().positive('Maximum stock level must be positive'))
    .optional(),
  packSize: z.string().optional(),
  unit: z.string().min(1, 'Unit is required'),
  weight: z.preprocess(toUndefinedIfBlankOrNaN, z.number().positive('Weight must be positive')).optional(),
  dimensions: z.string().optional(),
  isActive: z.boolean(),
  isPrescriptionRequired: z.boolean(),
  isRefrigerated: z.boolean(),
  isControlled: z.boolean(),
  tags: z.string().optional(),
  hasExpiry: z.boolean(),
  shelfLifeMonths: z
    .preprocess(toUndefinedIfBlankOrNaN, z.number().int().positive('Shelf life must be positive'))
    .optional(),
  minOrderQuantity: z.number().int().positive('Minimum order quantity must be positive'),
});

type ProductFormData = z.infer<typeof productSchema>;

interface Product {
  id: string;
  name: string;
  genericName?: string;
  brandName?: string;
  category: string;
  description?: string;
  manufacturer?: string;
  nafdacNumber?: string;
  strength?: string;
  dosageForm?: string;
  activeIngredient?: string;
  retailPrice: number;
  wholesalePrice?: number;
  cost?: number;
  sku: string;
  barcode?: string;
  stockQuantity: number;
  minStockLevel: number;
  maxStockLevel?: number;
  packSize?: string;
  unit: string;
  weight?: number;
  dimensions?: string;
  isActive: boolean;
  isPrescriptionRequired: boolean;
  isRefrigerated: boolean;
  isControlled: boolean;
  slug: string;
  images?: unknown[];
  imageUrl?: string;
  tags?: string;
  hasExpiry: boolean;
  shelfLifeMonths?: number;
  minOrderQuantity: number;
  bulkPricing?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProductEditFormProps {
  product: Product;
}

// API functions
const updateProduct = async (id: string, data: Partial<ProductFormData>) => {
  console.log('updateProduct called with id:', id, 'data:', data);
  const response = await fetch(`/api/admin/products/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include credentials for authentication
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update product');
  }

  return response.json();
};

const fetchProductImages = async (productId: string) => {
  const response = await fetch(`/api/products/${productId}/images`, {
    credentials: 'include', // Include credentials for authentication
  });
  if (!response.ok) {
    throw new Error('Failed to fetch product images');
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

export function ProductEditForm({ product }: ProductEditFormProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isFormDisabled, setIsFormDisabled] = useState(false);
  
  const router = useRouter();
  const queryClient = useQueryClient();

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isValid },
    setValue,
    watch,
    reset,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      name: product.name,
      genericName: product.genericName || '',
      brandName: product.brandName || '',
      category: product.category,
      description: product.description || '',
      manufacturer: product.manufacturer || '',
      nafdacNumber: product.nafdacNumber || '',
      strength: product.strength || '',
      dosageForm: product.dosageForm || '',
      activeIngredient: product.activeIngredient || '',
      retailPrice: product.retailPrice,
      wholesalePrice: product.wholesalePrice || undefined,
      cost: product.cost || undefined,
      sku: product.sku,
      barcode: product.barcode || '',
      stockQuantity: product.stockQuantity,
      minStockLevel: product.minStockLevel,
      maxStockLevel: product.maxStockLevel || undefined,
      packSize: product.packSize || '',
      unit: product.unit,
      weight: product.weight || undefined,
      dimensions: product.dimensions || '',
      isActive: product.isActive,
      isPrescriptionRequired: product.isPrescriptionRequired,
      isRefrigerated: product.isRefrigerated,
      isControlled: product.isControlled,
      tags: product.tags || '',
      hasExpiry: product.hasExpiry,
      shelfLifeMonths: product.shelfLifeMonths || undefined,
      minOrderQuantity: product.minOrderQuantity,
    },
  });

  // Fetch product images
  const {
    data: imageData,
    isLoading: imagesLoading,
    refetch: refetchImages
  } = useQuery({
    queryKey: ['product-images', product.id],
    queryFn: () => fetchProductImages(product.id),
    initialData: {
      images: product.images || [],
      primaryImage: product.imageUrl,
      imageCount: (product.images || []).length
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<ProductFormData>) => updateProduct(product.id, data),
    onMutate: () => {
      setIsSaving(true);
      setSaveStatus('saving');
      setSaveError(null);
      setIsFormDisabled(true);
    },
    onSuccess: (updatedProduct) => {
      setSaveStatus('success');
      setSaveError(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'inventory', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'product', product.id] });
      
      // Update form with fresh data from server
      reset({
        name: updatedProduct.name,
        genericName: updatedProduct.genericName || '',
        brandName: updatedProduct.brandName || '',
        category: updatedProduct.category,
        description: updatedProduct.description || '',
        manufacturer: updatedProduct.manufacturer || '',
        nafdacNumber: updatedProduct.nafdacNumber || '',
        strength: updatedProduct.strength || '',
        dosageForm: updatedProduct.dosageForm || '',
        activeIngredient: updatedProduct.activeIngredient || '',
        retailPrice: updatedProduct.retailPrice,
        wholesalePrice: updatedProduct.wholesalePrice || undefined,
        cost: updatedProduct.cost || undefined,
        sku: updatedProduct.sku,
        barcode: updatedProduct.barcode || '',
        stockQuantity: updatedProduct.stockQuantity,
        minStockLevel: updatedProduct.minStockLevel,
        maxStockLevel: updatedProduct.maxStockLevel || undefined,
        packSize: updatedProduct.packSize || '',
        unit: updatedProduct.unit,
        weight: updatedProduct.weight || undefined,
        dimensions: updatedProduct.dimensions || '',
        isActive: updatedProduct.isActive,
        isPrescriptionRequired: updatedProduct.isPrescriptionRequired,
        isRefrigerated: updatedProduct.isRefrigerated,
        isControlled: updatedProduct.isControlled,
        tags: updatedProduct.tags || '',
        hasExpiry: updatedProduct.hasExpiry,
        shelfLifeMonths: updatedProduct.shelfLifeMonths || undefined,
        minOrderQuantity: updatedProduct.minOrderQuantity,
      }, { keepValues: false });
      
      setTimeout(() => setSaveStatus('idle'), 3000);
    },
    onError: (error: Error) => {
      setSaveStatus('error');
      setSaveError(error.message);
      console.error('Update failed:', error);
      setTimeout(() => {
        setSaveStatus('idle');
        setSaveError(null);
      }, 8000);
    },
    onSettled: () => {
      setIsSaving(false);
      setIsFormDisabled(false);
    },
  });

  // Form submission
  const onSubmit = async (data: ProductFormData) => {
    console.log('Form submitted with data:', data);
    updateMutation.mutate(data);
  };

  // Handle images update
  const handleImagesUpdate = (newImages: unknown[]) => {
    refetchImages();
  };

  // Local state for bulk rules JSON for the editor
  const [bulkRulesJson, setBulkRulesJson] = useState<string>('[]');

  // Load bulk pricing rules from normalized API and feed editor
  useEffect(() => {
    let cancelled = false;
    const loadRules = async () => {
      try {
        const res = await fetch(`/api/admin/products/${product.id}/bulk-pricing`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        const json = JSON.stringify(data?.rules ?? []);
        if (!cancelled) setBulkRulesJson(json);
      } catch (e) {
        // non-fatal
      }
    };
    loadRules();
    return () => {
      cancelled = true;
    };
  }, [product.id]);

  // Format currency for display
  const formatCurrency = (amount: number | undefined | null) => {
    if (amount == null || isNaN(Number(amount))) {
      return '';
    }
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(Number(amount));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/app/admin/inventory">
            <Button variant="outline" size="sm" disabled={isSaving}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Inventory
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{product.name}</h2>
            <p className="text-sm text-gray-600">SKU: {product.sku}</p>
            {isDirty && saveStatus === 'idle' && (
              <p className="text-xs text-amber-600 mt-1">● Unsaved changes</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Save Status Indicator */}
          {saveStatus === 'saving' && (
            <div className="flex items-center space-x-2 text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Saving...</span>
            </div>
          )}
          {saveStatus === 'success' && (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Saved successfully</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Save failed</span>
            </div>
          )}
          
          <Button
            onClick={() => {
              console.log('Save button clicked, isDirty:', isDirty, 'isSaving:', isSaving, 'isValid:', isValid);
              console.log('Form errors:', errors);
              handleSubmit(onSubmit)();
            }}
            disabled={!isDirty || isSaving || !isValid}
            className="min-w-[120px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error Message Banner */}
      {saveError && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-900">Save Failed</h4>
              <p className="text-sm text-red-700 mt-1">{saveError}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3 text-red-700 border-red-300 hover:bg-red-100"
                onClick={() => setSaveError(null)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Basic Info</span>
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center space-x-2">
            <Package className="h-4 w-4" />
            <span>Inventory</span>
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4" />
            <span>Pricing</span>
          </TabsTrigger>
          <TabsTrigger value="images" className="flex items-center space-x-2">
            <ImageIcon className="h-4 w-4" />
            <span>Images ({imageData?.imageCount || 0})</span>
          </TabsTrigger>
        </TabsList>

        {/* Basic Information Tab */}
        <TabsContent value="basic">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Product Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Product Name */}
                <div>
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    {...register('name')}
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                  )}
                </div>

                {/* Generic Name */}
                <div>
                  <Label htmlFor="genericName">Generic Name</Label>
                  <Input id="genericName" {...register('genericName')} />
                </div>

                {/* Brand Name */}
                <div>
                  <Label htmlFor="brandName">Brand Name</Label>
                  <Input id="brandName" {...register('brandName')} />
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
                  <Input id="manufacturer" {...register('manufacturer')} />
                </div>

                {/* NAFDAC Number */}
                <div>
                  <Label htmlFor="nafdacNumber">NAFDAC Registration Number</Label>
                  <Input id="nafdacNumber" {...register('nafdacNumber')} />
                </div>

                {/* Strength */}
                <div>
                  <Label htmlFor="strength">Strength (mg/ml)</Label>
                  <Input id="strength" {...register('strength')} placeholder="e.g., 500mg" />
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

              {/* Product Flags */}
              <div className="mt-6">
                <Label className="text-base font-medium">Product Settings</Label>
                <div className="mt-3 space-y-4">
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
          </form>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Inventory Management</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* SKU */}
                <div>
                  <Label htmlFor="sku">SKU (Stock Keeping Unit) *</Label>
                  <Input
                    id="sku"
                    {...register('sku')}
                    className={errors.sku ? 'border-red-500' : ''}
                  />
                  {errors.sku && (
                    <p className="text-sm text-red-600 mt-1">{errors.sku.message}</p>
                  )}
                </div>

                {/* Barcode */}
                <div>
                  <Label htmlFor="barcode">Barcode</Label>
                  <Input id="barcode" {...register('barcode')} />
                </div>

                {/* Current Stock */}
                <div>
                  <Label htmlFor="stockQuantity">Current Stock *</Label>
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
                  <Input id="packSize" {...register('packSize')} placeholder="e.g., 10 tablets" />
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
          </form>
        </TabsContent>

        {/* Pricing Tab */}
        <TabsContent value="pricing">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Pricing Information</h3>
              
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
                  {watch('retailPrice') != null && !isNaN(Number(watch('retailPrice'))) && (
                    <p className="text-xs text-gray-600 mt-1">
                      {formatCurrency(watch('retailPrice'))}
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
                  {errors.wholesalePrice && (
                    <p className="text-sm text-red-600 mt-1">{errors.wholesalePrice.message}</p>
                  )}
                  {watch('wholesalePrice') != null && !isNaN(Number(watch('wholesalePrice'))) && (
                    <p className="text-xs text-gray-600 mt-1">
                      {formatCurrency(watch('wholesalePrice'))}
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
                  {errors.cost && (
                    <p className="text-sm text-red-600 mt-1">{errors.cost.message}</p>
                  )}
                  {watch('cost') != null && !isNaN(Number(watch('cost'))) && (
                    <p className="text-xs text-gray-600 mt-1">
                      {formatCurrency(watch('cost'))}
                    </p>
                  )}
                </div>
              </div>

              {/* Bulk Pricing */}
              <div className="mt-6">
                <Label htmlFor="bulkPricing">Bulk Pricing Rules</Label>
                <BulkPricingEditor
                  value={bulkRulesJson}
                  onChange={async (json) => {
                    setBulkRulesJson(json);
                    // Persist to normalized API
                    try {
                      const rules = JSON.parse(json || '[]');
                      await fetch(`/api/admin/products/${product.id}/bulk-pricing`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ rules }),
                      });
                    } catch (e) {
                      // swallow errors; UI remains updated locally
                    }
                  }}
                />
              </div>

              {/* Pricing Summary */}
              {(watch('retailPrice') || watch('wholesalePrice') || watch('cost')) && (
                <div className="mt-6 p-4 bg-white border border-gray-200 rounded-lg">
                  <h4 className="font-medium mb-2 text-gray-900">Pricing Summary</h4>
                  <div className="space-y-2 text-sm">
                    {watch('cost')! > 0 && watch('retailPrice')! > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Retail Margin:</span>
                        <span className="font-medium text-green-600">
                          {(((watch('retailPrice')! - watch('cost')!) / watch('cost')!) * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {watch('cost')! > 0 && watch('wholesalePrice')! > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Wholesale Margin:</span>
                        <span className="font-medium text-blue-600">
                          {(((watch('wholesalePrice')! - watch('cost')!) / watch('cost')!) * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </form>
        </TabsContent>

        {/* Images Tab */}
        <TabsContent value="images">
          <ProductImageManager
            productId={product.id}
            productName={product.name}
            images={imageData?.images || []}
            onImagesUpdate={handleImagesUpdate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
