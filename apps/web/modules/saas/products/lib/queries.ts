import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  productsAPI, 
  ProductFilters, 
  CreateProductData,
  Product
} from './api';

// Query Keys Factory
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: ProductFilters) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
  search: (query: string) => [...productKeys.all, 'search', query] as const,
  categories: ['categories'] as const,
  categoriesList: () => [...productKeys.categories, 'list'] as const,
  predefinedCategories: () => [...productKeys.categories, 'predefined'] as const,
  categoryProducts: (categoryName: string, options: any) => 
    [...productKeys.categories, 'products', categoryName, options] as const,
} as const;

// Products Queries
export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn: () => productsAPI.getProducts(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => productsAPI.getProduct(id),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!id,
    retry: (failureCount, error) => {
      // Don't retry on 404s
      if (error.message.includes('not found')) return false;
      return failureCount < 2;
    },
  });
}

export function useSearchProducts(query: string, limit = 10) {
  return useQuery({
    queryKey: productKeys.search(query),
    queryFn: () => productsAPI.searchProducts(query, limit),
    staleTime: 2 * 60 * 1000, // 2 minutes for search
    gcTime: 5 * 60 * 1000,
    enabled: query.trim().length >= 2, // Only search if query is at least 2 chars
    retry: 1,
  });
}

// Categories Queries
export function useCategories() {
  return useQuery({
    queryKey: productKeys.categoriesList(),
    queryFn: () => productsAPI.getCategories(),
    staleTime: 15 * 60 * 1000, // 15 minutes (categories don't change often)
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });
}

export function usePredefinedCategories() {
  return useQuery({
    queryKey: productKeys.predefinedCategories(),
    queryFn: () => productsAPI.getPredefinedCategories(),
    staleTime: 60 * 60 * 1000, // 1 hour (predefined categories are static)
    gcTime: 2 * 60 * 60 * 1000,
    retry: 1,
  });
}

export function useCategoryProducts(
  categoryName: string, 
  options: { page?: number; limit?: number; sort?: string } = {}
) {
  return useQuery({
    queryKey: productKeys.categoryProducts(categoryName, options),
    queryFn: () => productsAPI.getProductsByCategory(categoryName, options),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!categoryName,
    retry: 2,
  });
}

// Product Mutations
export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateProductData) => productsAPI.createProduct(data),
    onSuccess: (response) => {
      // Invalidate and refetch products lists
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.categoriesList() });
      
      // Add the new product to the cache
      queryClient.setQueryData(
        productKeys.detail(response.product.id),
        { product: response.product }
      );
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateProductData> }) => 
      productsAPI.updateProduct(id, data),
    onSuccess: (response, variables) => {
      // Update the product in cache
      queryClient.setQueryData(
        productKeys.detail(variables.id),
        { product: response.product }
      );
      
      // Invalidate lists to ensure they're up to date
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.categoriesList() });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => productsAPI.deleteProduct(id),
    onSuccess: (_, deletedId) => {
      // Remove the product from cache
      queryClient.removeQueries({ queryKey: productKeys.detail(deletedId) });
      
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.categoriesList() });
    },
  });
}

// Optimistic Updates for Cart Operations (if needed)
export function useOptimisticProductUpdate() {
  const queryClient = useQueryClient();
  
  const updateProductStock = (productId: string, newStock: number) => {
    queryClient.setQueryData(
      productKeys.detail(productId),
      (oldData: { product: Product } | undefined) => {
        if (!oldData) return oldData;
        
        return {
          product: {
            ...oldData.product,
            stock_quantity: newStock
          }
        };
      }
    );
    
    // Also update in any lists that contain this product
    queryClient.setQueriesData(
      { queryKey: productKeys.lists() },
      (oldData: any) => {
        if (!oldData?.products) return oldData;
        
        return {
          ...oldData,
          products: oldData.products.map((product: Product) =>
            product.id === productId 
              ? { ...product, stock_quantity: newStock }
              : product
          )
        };
      }
    );
  };
  
  return { updateProductStock };
}

// Prefetch utilities
export function usePrefetchProduct() {
  const queryClient = useQueryClient();
  
  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: productKeys.detail(id),
      queryFn: () => productsAPI.getProduct(id),
      staleTime: 5 * 60 * 1000,
    });
  };
}

export function usePrefetchProducts() {
  const queryClient = useQueryClient();
  
  return (filters: ProductFilters) => {
    queryClient.prefetchQuery({
      queryKey: productKeys.list(filters),
      queryFn: () => productsAPI.getProducts(filters),
      staleTime: 5 * 60 * 1000,
    });
  };
}
