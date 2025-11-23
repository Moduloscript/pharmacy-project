// TanStack Query compatible API client

export interface Product {
  id: string;
  name: string;
  generic_name?: string;
  genericName?: string;
  brand_name?: string;
  brandName?: string;
  category: string;
  description?: string;
  image_url?: string;
  imageUrl?: string;
  wholesale_price?: number;
  wholesalePrice?: number;
  retail_price: number;
  retailPrice?: number;
  stock_quantity: number;
  stockQuantity?: number;
  min_order_qty?: number;
  minOrderQuantity?: number;
  is_prescription_required?: boolean;
  isPrescriptionRequired?: boolean;
  nafdac_reg_number?: string;
  nafdacNumber?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  organization?: { id: string; name: string };
  // Additional optional fields used in UI
  images?: Array<string | { url?: string }>; // product images
  requires_prescription?: boolean;
  manufacturer?: string;
  unit?: string;
  pack_size?: number;
  dosage_form?: string;
  strength?: string;
  therapeutic_class?: string;
  storage_conditions?: string;
  usage_instructions?: string;
  side_effects?: string;
  contraindications?: string;
  hasBulkRules?: boolean;
}

export interface ProductsResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface Category {
  name: string;
  count: number;
}

export interface CategoriesResponse {
  categories: Category[];
  total: number;
}

export interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  min_price?: number;
  max_price?: number;
  prescription_only?: boolean;
  in_stock_only?: boolean;
  // Sort parameter (e.g., "updated_desc", "name_asc", "price_asc", "price_desc", "stock_desc")
  sort?: string;
}

export interface CreateProductData {
  name: string;
  generic_name?: string;
  brand_name?: string;
  category: string;
  description?: string;
  image_url?: string;
  wholesale_price: number;
  retail_price: number;
  stock_quantity?: number;
  min_order_qty?: number;
  is_prescription_required?: boolean;
  nafdac_reg_number?: string;
}

class ProductsAPI {
  // Get products with filters
  async getProducts(filters: ProductFilters = {}): Promise<ProductsResponse> {
    const searchParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });

    const response = await fetch(`/api/products?${searchParams}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch products');
    }
    
    return response.json();
  }

  // Get single product
  async getProduct(id: string): Promise<{ product: Product }> {
    const response = await fetch(`/api/products/${id}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Product not found');
      }
      throw new Error('Failed to fetch product');
    }
    
    return response.json();
  }

  // Search products
  async searchProducts(query: string, limit = 10): Promise<{ products: Product[] }> {
    const searchParams = new URLSearchParams({
      q: query,
      limit: String(limit)
    });

    const response = await fetch(`/api/products/search?${searchParams}`);
    
    if (!response.ok) {
      throw new Error('Failed to search products');
    }
    
    return response.json();
  }

  // Create product (admin only)
  async createProduct(data: CreateProductData): Promise<{ product: Product }> {
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create product');
    }
    
    return response.json();
  }

  // Update product (admin only)
  async updateProduct(id: string, data: Partial<CreateProductData>): Promise<{ product: Product }> {
    const response = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update product');
    }
    
    return response.json();
  }

  // Delete product (admin only)
  async deleteProduct(id: string): Promise<{ message: string }> {
    const response = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete product');
    }
    
    return response.json();
  }

  // Get categories
  async getCategories(): Promise<CategoriesResponse> {
    const response = await fetch('/api/categories');
    
    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }
    
    return response.json();
  }

  // Get predefined categories
  async getPredefinedCategories(): Promise<CategoriesResponse> {
    const response = await fetch('/api/categories/predefined');
    
    if (!response.ok) {
      throw new Error('Failed to fetch predefined categories');
    }
    
    return response.json();
  }

  // Get products by category
  async getProductsByCategory(
    categoryName: string, 
    options: { page?: number; limit?: number; sort?: string } = {}
  ): Promise<{
    category: string;
    products: Product[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const searchParams = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });

    const response = await fetch(
      `/api/categories/${encodeURIComponent(categoryName)}/products?${searchParams}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch products by category');
    }
    
    return response.json();
  }
}

export const productsAPI = new ProductsAPI();

// Utility functions
export function formatPrice(price: number | null | undefined, currency = '₦'): string {
  // Handle undefined, null, or invalid price values
  if (price === undefined || price === null || isNaN(price)) {
    return `${currency}0`;
  }
  return `${currency}${price.toLocaleString('en-NG')}`;
}

export function getStockStatus(quantity: number): {
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
  label: string;
  className: string;
} {
  if (quantity === 0) {
    return {
      status: 'out-of-stock',
      label: 'Out of Stock',
      className: 'text-red-600 bg-red-50'
    };
  }
  
  if (quantity <= 10) {
    return {
      status: 'low-stock',
      label: `Low Stock (${quantity} left)`,
      className: 'text-amber-600 bg-amber-50'
    };
  }
  
  return {
    status: 'in-stock',
    label: 'In Stock',
    className: 'text-green-600 bg-green-50'
  };
}

export function getPrescriptionBadge(isRequired: boolean): {
  label: string;
  className: string;
} {
  return isRequired 
    ? {
        label: 'Prescription Required',
        className: 'text-red-600 bg-red-50 border-red-200'
      }
    : {
        label: 'Over the Counter',
        className: 'text-green-600 bg-green-50 border-green-200'
      };
}
