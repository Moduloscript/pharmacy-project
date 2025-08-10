'use client';

import { useMemo } from 'react';
import { useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { Badge } from '@ui/components/badge';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/components/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/components/table';
import { cn } from '@ui/lib';
import {
  SearchIcon,
  FilterIcon,
  RefreshCwIcon,
  EyeIcon,
  EditIcon,
  AlertTriangleIcon,
  XCircleIcon,
  PackageIcon,
  PlusIcon,
  CalendarIcon,
  TrendingDownIcon,
  TrendingUpIcon
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

// Types
interface Product {
  id: string;
  name: string;
  genericName?: string;
  brandName?: string;
  category: string;
  description?: string;
  imageUrl?: string;
  wholesalePrice: number;
  retailPrice: number;
  stockQuantity: number;
  minOrderQty: number;
  isPrescriptionRequired: boolean;
  nafdacRegNumber?: string;
  expiryDate?: string;
  batchNumber?: string;
  supplier?: string;
  reorderPoint?: number;
  createdAt: string;
  updatedAt: string;
}

interface InventoryFilters {
  search: string;
  category: string;
  stockStatus: string;
  expiryStatus: string;
  showFilters: boolean;
}

// Jotai atoms for state management
const inventoryFiltersAtom = atomWithStorage<InventoryFilters>('admin-inventory-filters', {
  search: '',
  category: 'all',
  stockStatus: 'all',
  expiryStatus: 'all',
  showFilters: false,
});

// API functions
const fetchProducts = async (): Promise<Product[]> => {
  const response = await fetch('/api/admin/products');
  if (!response.ok) {
    throw new Error('Failed to fetch products');
  }
  return response.json();
};

const updateProductStock = async ({ 
  productId, 
  stockQuantity 
}: { 
  productId: string; 
  stockQuantity: number; 
}): Promise<Product> => {
  const response = await fetch(`/api/admin/products/${productId}/stock`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ stockQuantity }),
  });

  if (!response.ok) {
    throw new Error('Failed to update stock');
  }
  return response.json();
};

const bulkUpdateStock = async (updates: Array<{ id: string; stockQuantity: number }>) => {
  const response = await fetch('/api/admin/products/bulk-update', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ updates }),
  });

  if (!response.ok) {
    throw new Error('Failed to update stock');
  }
  return response.json();
};

// Custom hooks
const useProducts = () => {
  return useQuery({
    queryKey: ['admin', 'inventory', 'products'],
    queryFn: fetchProducts,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
  });
};

const useUpdateStock = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateProductStock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'inventory', 'products'] });
    },
    onError: (error) => {
      alert(`Failed to update stock: ${error.message}`);
    },
  });
};

const useBulkUpdateStock = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: bulkUpdateStock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'inventory', 'products'] });
    },
    onError: (error) => {
      alert(`Failed to bulk update stock: ${error.message}`);
    },
  });
};

interface InventoryTableProps {
  className?: string;
}

export function InventoryTable({ className }: InventoryTableProps) {
  const [filters, setFilters] = useAtom(inventoryFiltersAtom);
  const queryClient = useQueryClient();
  
  // React Query hooks
  const { 
    data: products = [], 
    isLoading, 
    error, 
    refetch 
  } = useProducts();
  
  const updateStockMutation = useUpdateStock();
  const bulkUpdateMutation = useBulkUpdateStock();

  // Calculate inventory stats and filter products
  const { filteredProducts, inventoryStats } = useMemo(() => {
    let filtered = products;
    const now = new Date();

    // Apply search filter
    if (filters.search.trim()) {
      const term = filters.search.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(term) ||
        product.genericName?.toLowerCase().includes(term) ||
        product.brandName?.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term) ||
        product.nafdacRegNumber?.toLowerCase().includes(term)
      );
    }

    // Apply category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(product => product.category.toLowerCase() === filters.category);
    }

    // Apply stock status filter
    if (filters.stockStatus !== 'all') {
      switch (filters.stockStatus) {
        case 'out_of_stock':
          filtered = filtered.filter(product => product.stockQuantity === 0);
          break;
        case 'low_stock':
          filtered = filtered.filter(product => 
            product.stockQuantity > 0 && product.stockQuantity <= (product.reorderPoint || 10)
          );
          break;
        case 'in_stock':
          filtered = filtered.filter(product => 
            product.stockQuantity > (product.reorderPoint || 10)
          );
          break;
      }
    }

    // Apply expiry status filter
    if (filters.expiryStatus !== 'all') {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      switch (filters.expiryStatus) {
        case 'expired':
          filtered = filtered.filter(product => 
            product.expiryDate && new Date(product.expiryDate) < now
          );
          break;
        case 'expiring_soon':
          filtered = filtered.filter(product => 
            product.expiryDate && 
            new Date(product.expiryDate) > now && 
            new Date(product.expiryDate) <= thirtyDaysFromNow
          );
          break;
        case 'fresh':
          filtered = filtered.filter(product => 
            !product.expiryDate || new Date(product.expiryDate) > thirtyDaysFromNow
          );
          break;
      }
    }

    // Calculate stats
    const stats = {
      totalProducts: products.length,
      outOfStock: products.filter(p => p.stockQuantity === 0).length,
      lowStock: products.filter(p => 
        p.stockQuantity > 0 && p.stockQuantity <= (p.reorderPoint || 10)
      ).length,
      expired: products.filter(p => 
        p.expiryDate && new Date(p.expiryDate) < now
      ).length,
      expiringSoon: products.filter(p => {
        if (!p.expiryDate) return false;
        const expiryDate = new Date(p.expiryDate);
        const thirtyDays = new Date();
        thirtyDays.setDate(thirtyDays.getDate() + 30);
        return expiryDate > now && expiryDate <= thirtyDays;
      }).length,
      totalValue: products.reduce((sum, p) => sum + (p.stockQuantity * p.retailPrice), 0),
    };

    return { filteredProducts: filtered, inventoryStats: stats };
  }, [products, filters]);

  // Filter update helpers
  const updateFilter = (key: keyof InventoryFilters, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: 'all',
      stockStatus: 'all',
      expiryStatus: 'all',
      showFilters: false,
    });
  };

  const handleStockUpdate = (productId: string, newStock: number) => {
    updateStockMutation.mutate({ productId, stockQuantity: newStock });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'inventory', 'products'] });
    refetch();
  };

  // Utility functions
  const getStockStatusColor = (product: Product) => {
    if (product.stockQuantity === 0) {
      return 'bg-red-100 text-red-800';
    } else if (product.stockQuantity <= (product.reorderPoint || 10)) {
      return 'bg-yellow-100 text-yellow-800';
    } else {
      return 'bg-green-100 text-green-800';
    }
  };

  const getStockStatus = (product: Product) => {
    if (product.stockQuantity === 0) {
      return 'Out of Stock';
    } else if (product.stockQuantity <= (product.reorderPoint || 10)) {
      return 'Low Stock';
    } else {
      return 'In Stock';
    }
  };

  const getExpiryStatus = (expiryDate?: string) => {
    if (!expiryDate) return null;
    
    const expiry = new Date(expiryDate);
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    if (expiry < now) {
      return { status: 'Expired', color: 'bg-red-100 text-red-800' };
    } else if (expiry <= thirtyDaysFromNow) {
      return { status: 'Expiring Soon', color: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { status: 'Fresh', color: 'bg-green-100 text-green-800' };
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  // Error state
  if (error) {
    return (
      <Card className="p-6 bg-red-50 border-red-200">
        <div className="flex items-center space-x-3">
          <XCircleIcon className="size-5 text-red-600" />
          <div>
            <h3 className="font-semibold text-red-900">Failed to load inventory</h3>
            <p className="text-sm text-red-700 mt-1">{error.message}</p>
            <Button variant="outline" onClick={handleRefresh} className="mt-3" size="sm">
              Try Again
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Inventory Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <PackageIcon className="size-8 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{inventoryStats.totalProducts}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <AlertTriangleIcon className="size-8 text-red-600" />
            <div>
              <p className="text-sm font-medium text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600">{inventoryStats.outOfStock}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <TrendingDownIcon className="size-8 text-yellow-600" />
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-yellow-600">{inventoryStats.lowStock}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <CalendarIcon className="size-8 text-orange-600" />
            <div>
              <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-orange-600">{inventoryStats.expiringSoon}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
              <Input
                placeholder="Search products, NAFDAC numbers, categories..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Button
              variant="outline"
              onClick={() => updateFilter('showFilters', !filters.showFilters)}
            >
              <FilterIcon className="size-4 mr-2" />
              Filters
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Button onClick={handleRefresh} size="sm" disabled={isLoading}>
              <RefreshCwIcon className={cn("size-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>

            <Link href="/app/admin/products/new">
              <Button size="sm">
                <PlusIcon className="size-4 mr-2" />
                Add Product
              </Button>
            </Link>
          </div>
        </div>

        {/* Advanced Filters */}
        {filters.showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
            <div>
              <Label>Category</Label>
              <Select value={filters.category} onValueChange={(value) => updateFilter('category', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="pain_relief">Pain Relief</SelectItem>
                  <SelectItem value="antibiotics">Antibiotics</SelectItem>
                  <SelectItem value="vitamins">Vitamins</SelectItem>
                  <SelectItem value="first_aid">First Aid</SelectItem>
                  <SelectItem value="prescription">Prescription</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Stock Status</Label>
              <Select value={filters.stockStatus} onValueChange={(value) => updateFilter('stockStatus', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock Levels</SelectItem>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Expiry Status</Label>
              <Select value={filters.expiryStatus} onValueChange={(value) => updateFilter('expiryStatus', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  <SelectItem value="fresh">Fresh</SelectItem>
                  <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Inventory Table */}
      <Card>
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Products ({filteredProducts.length} of {products.length})
            </h2>
            <div className="flex items-center space-x-2">
              <p className="text-sm text-gray-600">
                Total Value: {formatCurrency(inventoryStats.totalValue)}
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center space-x-4">
                    <div className="h-4 bg-gray-300 rounded w-32"></div>
                    <div className="h-4 bg-gray-300 rounded w-24"></div>
                    <div className="h-4 bg-gray-300 rounded w-16"></div>
                    <div className="h-4 bg-gray-300 rounded w-20"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-6 text-center">
            <PackageIcon className="size-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">No products found</h3>
            <p className="text-gray-600">
              {filters.search || filters.category !== 'all' || filters.stockStatus !== 'all' || filters.expiryStatus !== 'all'
                ? 'Try adjusting your search criteria or filters'
                : 'No products have been added yet'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Prices</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const expiryStatus = getExpiryStatus(product.expiryDate);
                
                // Debug logging for products without images
                if (!product.imageUrl) {
                  console.log('❌ InventoryTable - Product missing imageUrl:', {
                    name: product.name,
                    id: product.id,
                    imageUrl: product.imageUrl,
                    hasImageUrl: !!product.imageUrl
                  });
                }
                
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="w-16 h-16 relative rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                        {product.imageUrl ? (
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="64px"
                            onError={(e) => {
                              console.error('🖼️ InventoryTable - Image failed to load:', {
                                productName: product.name,
                                imageUrl: product.imageUrl,
                                productId: product.id,
                                error: e
                              });
                              // Hide broken image and show placeholder
                              e.currentTarget.style.display = 'none';
                              const container = e.currentTarget.parentElement;
                              if (container) {
                                const placeholder = container.querySelector('.image-placeholder');
                                if (placeholder) {
                                  (placeholder as HTMLElement).style.display = 'flex';
                                }
                              }
                            }}
                            onLoad={() => {
                              console.log('✅ InventoryTable - Image loaded successfully:', {
                                productName: product.name,
                                imageUrl: product.imageUrl
                              });
                            }}
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full">
                            <PackageIcon className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                        {/* Always render placeholder, hidden when image loads */}
                        <div 
                          className="image-placeholder flex items-center justify-center w-full h-full" 
                          style={{ display: product.imageUrl ? 'none' : 'flex' }}
                        >
                          <PackageIcon className="w-8 h-8 text-gray-400" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        {product.genericName && (
                          <p className="text-sm text-gray-600">{product.genericName}</p>
                        )}
                        {product.nafdacRegNumber && (
                          <p className="text-xs text-gray-500">NAFDAC: {product.nafdacRegNumber}</p>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant="secondary">
                        {product.category}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-semibold">{product.stockQuantity}</p>
                        <Input
                          type="number"
                          value={product.stockQuantity}
                          onChange={(e) => {
                            const newStock = parseInt(e.target.value) || 0;
                            if (newStock !== product.stockQuantity) {
                              handleStockUpdate(product.id, newStock);
                            }
                          }}
                          className="w-20 h-8 text-xs"
                          min="0"
                        />
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div>
                        <p className="text-sm">Retail: {formatCurrency(product.retailPrice)}</p>
                        <p className="text-xs text-gray-600">
                          Wholesale: {formatCurrency(product.wholesalePrice)}
                        </p>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge className={getStockStatusColor(product)}>
                        {getStockStatus(product)}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      {expiryStatus ? (
                        <div>
                          <Badge className={expiryStatus.color}>
                            {expiryStatus.status}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(product.expiryDate!).toLocaleDateString()}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">No expiry</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Link href={`/app/admin/products/${product.id}`}>
                          <Button variant="outline" size="sm">
                            <EyeIcon className="size-4" />
                          </Button>
                        </Link>
                        
                        <Link href={`/app/admin/products/${product.id}/edit`}>
                          <Button variant="outline" size="sm">
                            <EditIcon className="size-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
