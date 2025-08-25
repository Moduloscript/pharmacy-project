import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { ProductFilters, Product } from './api';

// Product Filters State
export const productFiltersAtom = atom<ProductFilters>({
  page: 1,
  limit: 20,
});

// Search Query State
export const searchQueryAtom = atom<string>('');

// View Mode State (persisted)
export const viewModeAtom = atomWithStorage<'grid' | 'list'>('product-view-mode', 'grid');

// Density State (persisted)
export const densityAtom = atomWithStorage<'comfortable' | 'compact'>('product-density', 'comfortable');

// Recently Viewed Products (persisted)
export const recentlyViewedAtom = atomWithStorage<Product[]>('recently-viewed-products', []);

// Add to Recently Viewed
export const addToRecentlyViewedAtom = atom(
  null,
  (get, set, product: Product) => {
    const current = get(recentlyViewedAtom);
    const filtered = current.filter(p => p.id !== product.id);
    const updated = [product, ...filtered].slice(0, 10); // Keep only 10 recent items
    set(recentlyViewedAtom, updated);
  }
);

// Product Comparison State
export const comparisonProductsAtom = atomWithStorage<Product[]>('comparison-products', []);

// Add to Comparison
export const addToComparisonAtom = atom(
  null,
  (get, set, product: Product) => {
    const current = get(comparisonProductsAtom);
    if (current.find(p => p.id === product.id)) return; // Already in comparison
    if (current.length >= 4) return; // Max 4 products for comparison
    
    set(comparisonProductsAtom, [...current, product]);
  }
);

// Remove from Comparison
export const removeFromComparisonAtom = atom(
  null,
  (get, set, productId: string) => {
    const current = get(comparisonProductsAtom);
    set(comparisonProductsAtom, current.filter(p => p.id !== productId));
  }
);

// Clear Comparison
export const clearComparisonAtom = atom(
  null,
  (get, set) => {
    set(comparisonProductsAtom, []);
  }
);

// Selected Category State
export const selectedCategoryAtom = atom<string | undefined>(undefined);

// UI States
export interface ProductUIState {
  isFiltersOpen: boolean;
  isSearchFocused: boolean;
  selectedProductId: string | null;
  loading: {
    products: boolean;
    categories: boolean;
    search: boolean;
  };
}

export const productUIAtom = atom<ProductUIState>({
  isFiltersOpen: false,
  isSearchFocused: false,
  selectedProductId: null,
  loading: {
    products: false,
    categories: false,
    search: false,
  },
});

// Derived atoms for complex state
export const hasActiveFiltersAtom = atom((get) => {
  const filters = get(productFiltersAtom);
  return Boolean(
    filters.search || 
    filters.category || 
    filters.min_price || 
    filters.max_price || 
    filters.prescription_only !== undefined || 
    filters.in_stock_only
  );
});

export const comparisonCountAtom = atom((get) => {
  return get(comparisonProductsAtom).length;
});

// Actions for updating filters
export const updateFiltersAtom = atom(
  null,
  (get, set, updates: Partial<ProductFilters>) => {
    const current = get(productFiltersAtom);
    const newFilters = { ...current, ...updates };
    
    // Reset page when other filters change (except page itself)
    if ('page' in updates && updates.page !== undefined) {
      // Page change requested, keep it
    } else {
      // Other filter changed, reset to page 1
      newFilters.page = 1;
    }
    
    set(productFiltersAtom, newFilters);
  }
);

// Clear filters action
export const clearFiltersAtom = atom(
  null,
  (get, set) => {
    const current = get(productFiltersAtom);
    set(productFiltersAtom, {
      page: 1,
      limit: current.limit || 20,
    });
  }
);

// Search action
export const setSearchQueryAtom = atom(
  null,
  (get, set, query: string) => {
    set(searchQueryAtom, query);
    // Also update filters if needed
    set(updateFiltersAtom, { search: query || undefined });
  }
);

// UI Actions
export const toggleFiltersAtom = atom(
  null,
  (get, set) => {
    const current = get(productUIAtom);
    set(productUIAtom, {
      ...current,
      isFiltersOpen: !current.isFiltersOpen,
    });
  }
);

export const setSearchFocusAtom = atom(
  null,
  (get, set, focused: boolean) => {
    const current = get(productUIAtom);
    set(productUIAtom, {
      ...current,
      isSearchFocused: focused,
    });
  }
);

export const setSelectedProductAtom = atom(
  null,
  (get, set, productId: string | null) => {
    const current = get(productUIAtom);
    set(productUIAtom, {
      ...current,
      selectedProductId: productId,
    });
  }
);

// Pricing display preferences
export interface PricingPreferences {
  showWholesalePrice: boolean;
  currency: string;
  taxIncluded: boolean;
}

export const pricingPreferencesAtom = atomWithStorage<PricingPreferences>('pricing-preferences', {
  showWholesalePrice: false,
  currency: 'NGN',
  taxIncluded: true,
});

// Nigerian-specific state
export interface NigerianLocation {
  state: string;
  lga: string;
}

export const userLocationAtom = atomWithStorage<NigerianLocation | null>('user-location', null);

// Prescription preferences
export const prescriptionFilterAtom = atom<'all' | 'prescription' | 'otc'>('all');

// Bulk order state (for wholesale customers)
export interface BulkOrderItem {
  productId: string;
  quantity: number;
  notes?: string;
  unitPrice?: number;
}

export const bulkOrderAtom = atomWithStorage<BulkOrderItem[]>('bulk-order', []);

export const addToBulkOrderAtom = atom(
  null,
  (get, set, item: BulkOrderItem) => {
    const current = get(bulkOrderAtom);
    const existingIndex = current.findIndex(i => i.productId === item.productId);
    
    if (existingIndex >= 0) {
      // Update existing item
      const updated = [...current];
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: item.quantity,
        notes: item.notes,
        unitPrice: item.unitPrice,
      };
      set(bulkOrderAtom, updated);
    } else {
      // Add new item
      set(bulkOrderAtom, [...current, item]);
    }
  }
);

// Update bulk order item (alias for addToBulkOrderAtom for backwards compatibility)
export const updateBulkOrderAtom = addToBulkOrderAtom;

export const removeFromBulkOrderAtom = atom(
  null,
  (get, set, productId: string) => {
    const current = get(bulkOrderAtom);
    set(bulkOrderAtom, current.filter(item => item.productId !== productId));
  }
);

export const clearBulkOrderAtom = atom(
  null,
  (get, set) => {
    set(bulkOrderAtom, []);
  }
);

// Bulk order total count
export const bulkOrderCountAtom = atom((get) => {
  return get(bulkOrderAtom).reduce((total, item) => total + item.quantity, 0);
});
