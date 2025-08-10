import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// Product Image Upload State
export interface ImageUploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  url?: string;
}

export interface ProductImage {
  url: string;
  key: string;
  originalName: string;
  size: number;
  type: string;
}

// Admin UI State
export interface AdminUIState {
  activeProductTab: 'basic' | 'inventory' | 'pricing' | 'images';
  isImageUploading: boolean;
  uploadProgress: ImageUploadProgress[];
  previewImage: ProductImage | null;
  draggedImageIndex: number | null;
  saveStatus: 'idle' | 'saving' | 'success' | 'error';
}

export const adminUIAtom = atom<AdminUIState>({
  activeProductTab: 'basic',
  isImageUploading: false,
  uploadProgress: [],
  previewImage: null,
  draggedImageIndex: null,
  saveStatus: 'idle',
});

// Product Form State
export interface ProductFormState {
  isDirty: boolean;
  isValid: boolean;
  errors: Record<string, string>;
  currentProductId?: string;
}

export const productFormStateAtom = atom<ProductFormState>({
  isDirty: false,
  isValid: false,
  errors: {},
});

// Inventory Filters (already exists in InventoryTable, but let's centralize it)
export interface InventoryFilters {
  search: string;
  category: string;
  stockStatus: string;
  expiryStatus: string;
  showFilters: boolean;
}

export const inventoryFiltersAtom = atomWithStorage<InventoryFilters>('admin-inventory-filters', {
  search: '',
  category: 'all',
  stockStatus: 'all',
  expiryStatus: 'all',
  showFilters: false,
});

// Selected Products State (for bulk operations)
export const selectedProductsAtom = atom<string[]>([]);

// Bulk Operations State
export interface BulkOperation {
  type: 'stock_update' | 'price_update' | 'category_update' | 'status_update';
  productIds: string[];
  data: Record<string, any>;
  status: 'idle' | 'processing' | 'success' | 'error';
  progress: number;
}

export const bulkOperationAtom = atom<BulkOperation | null>(null);

// Actions for Admin UI
export const setActiveProductTabAtom = atom(
  null,
  (get, set, tab: AdminUIState['activeProductTab']) => {
    const current = get(adminUIAtom);
    set(adminUIAtom, { ...current, activeProductTab: tab });
  }
);

export const setPreviewImageAtom = atom(
  null,
  (get, set, image: ProductImage | null) => {
    const current = get(adminUIAtom);
    set(adminUIAtom, { ...current, previewImage: image });
  }
);

export const setSaveStatusAtom = atom(
  null,
  (get, set, status: AdminUIState['saveStatus']) => {
    const current = get(adminUIAtom);
    set(adminUIAtom, { ...current, saveStatus: status });
  }
);

export const setUploadProgressAtom = atom(
  null,
  (get, set, progress: ImageUploadProgress[]) => {
    const current = get(adminUIAtom);
    set(adminUIAtom, { 
      ...current, 
      uploadProgress: progress,
      isImageUploading: progress.some(p => p.status === 'uploading')
    });
  }
);

export const setDraggedImageIndexAtom = atom(
  null,
  (get, set, index: number | null) => {
    const current = get(adminUIAtom);
    set(adminUIAtom, { ...current, draggedImageIndex: index });
  }
);

// Product Form Actions
export const setProductFormStateAtom = atom(
  null,
  (get, set, updates: Partial<ProductFormState>) => {
    const current = get(productFormStateAtom);
    set(productFormStateAtom, { ...current, ...updates });
  }
);

// Inventory Filter Actions
export const updateInventoryFiltersAtom = atom(
  null,
  (get, set, updates: Partial<InventoryFilters>) => {
    const current = get(inventoryFiltersAtom);
    set(inventoryFiltersAtom, { ...current, ...updates });
  }
);

export const clearInventoryFiltersAtom = atom(
  null,
  (get, set) => {
    set(inventoryFiltersAtom, {
      search: '',
      category: 'all',
      stockStatus: 'all',
      expiryStatus: 'all',
      showFilters: false,
    });
  }
);

// Selected Products Actions
export const toggleProductSelectionAtom = atom(
  null,
  (get, set, productId: string) => {
    const current = get(selectedProductsAtom);
    const isSelected = current.includes(productId);
    
    if (isSelected) {
      set(selectedProductsAtom, current.filter(id => id !== productId));
    } else {
      set(selectedProductsAtom, [...current, productId]);
    }
  }
);

export const selectAllProductsAtom = atom(
  null,
  (get, set, productIds: string[]) => {
    set(selectedProductsAtom, productIds);
  }
);

export const clearProductSelectionAtom = atom(
  null,
  (get, set) => {
    set(selectedProductsAtom, []);
  }
);

// Bulk Operations Actions
export const setBulkOperationAtom = atom(
  null,
  (get, set, operation: BulkOperation | null) => {
    set(bulkOperationAtom, operation);
  }
);

export const updateBulkOperationProgressAtom = atom(
  null,
  (get, set, progress: number) => {
    const current = get(bulkOperationAtom);
    if (current) {
      set(bulkOperationAtom, { ...current, progress });
    }
  }
);

// Derived atoms
export const selectedProductCountAtom = atom((get) => {
  return get(selectedProductsAtom).length;
});

export const hasSelectedProductsAtom = atom((get) => {
  return get(selectedProductsAtom).length > 0;
});

export const isUploadingImagesAtom = atom((get) => {
  const ui = get(adminUIAtom);
  return ui.isImageUploading;
});

export const uploadProgressCountAtom = atom((get) => {
  const ui = get(adminUIAtom);
  return ui.uploadProgress.length;
});

// Form validation helpers
export const hasFormErrorsAtom = atom((get) => {
  const form = get(productFormStateAtom);
  return Object.keys(form.errors).length > 0;
});

export const canSaveFormAtom = atom((get) => {
  const form = get(productFormStateAtom);
  const ui = get(adminUIAtom);
  return form.isDirty && form.isValid && ui.saveStatus !== 'saving';
});

// Admin Dashboard State
export interface AdminDashboardState {
  selectedDateRange: '7d' | '30d' | '90d' | '1y';
  refreshInterval: number;
  autoRefresh: boolean;
}

export const adminDashboardAtom = atomWithStorage<AdminDashboardState>('admin-dashboard-state', {
  selectedDateRange: '30d',
  refreshInterval: 60000, // 1 minute
  autoRefresh: true,
});

// Admin Notifications
export interface AdminNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

export const adminNotificationsAtom = atomWithStorage<AdminNotification[]>('admin-notifications', []);

export const addAdminNotificationAtom = atom(
  null,
  (get, set, notification: Omit<AdminNotification, 'id' | 'timestamp' | 'read'>) => {
    const current = get(adminNotificationsAtom);
    const newNotification: AdminNotification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false,
    };
    
    // Keep only last 50 notifications
    const updated = [newNotification, ...current].slice(0, 50);
    set(adminNotificationsAtom, updated);
  }
);

export const markNotificationReadAtom = atom(
  null,
  (get, set, notificationId: string) => {
    const current = get(adminNotificationsAtom);
    const updated = current.map(notification =>
      notification.id === notificationId
        ? { ...notification, read: true }
        : notification
    );
    set(adminNotificationsAtom, updated);
  }
);

export const clearReadNotificationsAtom = atom(
  null,
  (get, set) => {
    const current = get(adminNotificationsAtom);
    const unread = current.filter(notification => !notification.read);
    set(adminNotificationsAtom, unread);
  }
);

// Unread notifications count
export const unreadNotificationsCountAtom = atom((get) => {
  const notifications = get(adminNotificationsAtom);
  return notifications.filter(notification => !notification.read).length;
});

// Recently accessed products
export const recentlyAccessedProductsAtom = atomWithStorage<Array<{
  id: string;
  name: string;
  accessedAt: Date;
}>>('admin-recent-products', []);

export const addRecentlyAccessedProductAtom = atom(
  null,
  (get, set, product: { id: string; name: string }) => {
    const current = get(recentlyAccessedProductsAtom);
    const filtered = current.filter(p => p.id !== product.id);
    const updated = [
      { ...product, accessedAt: new Date() },
      ...filtered
    ].slice(0, 10); // Keep only 10 recent items
    
    set(recentlyAccessedProductsAtom, updated);
  }
);
