import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminDashboardAPI } from './api';
import { 
  DashboardMetrics, 
  RevenueData, 
  ProductPerformance, 
  InventoryAlert, 
  SystemHealth, 
  DashboardFilters 
} from './types';

// Query Keys Factory
export const adminKeys = {
  all: ['admin'] as const,
  dashboard: () => [...adminKeys.all, 'dashboard'] as const,
  metrics: (filters?: DashboardFilters) => [...adminKeys.dashboard(), 'metrics', filters] as const,
  revenue: (filters?: DashboardFilters) => [...adminKeys.dashboard(), 'revenue', filters] as const,
  topProducts: (limit: number, filters?: DashboardFilters) => 
    [...adminKeys.dashboard(), 'top-products', limit, filters] as const,
  inventory: () => [...adminKeys.all, 'inventory'] as const,
  inventoryAlerts: () => [...adminKeys.inventory(), 'alerts'] as const,
  system: () => [...adminKeys.all, 'system'] as const,
  systemHealth: () => [...adminKeys.system(), 'health'] as const,
} as const;

// Dashboard Queries
export function useDashboardMetrics(filters?: DashboardFilters) {
  return useQuery({
    queryKey: adminKeys.metrics(filters),
    queryFn: () => AdminDashboardAPI.getDashboardMetrics(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
}

export function useRevenueAnalytics(filters?: DashboardFilters) {
  return useQuery({
    queryKey: adminKeys.revenue(filters),
    queryFn: () => AdminDashboardAPI.getRevenueAnalytics(filters),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

export function useTopProducts(limit = 10, filters?: DashboardFilters) {
  return useQuery({
    queryKey: adminKeys.topProducts(limit, filters),
    queryFn: () => AdminDashboardAPI.getTopProducts(limit, filters),
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

export function useInventoryAlerts() {
  return useQuery({
    queryKey: adminKeys.inventoryAlerts(),
    queryFn: () => AdminDashboardAPI.getInventoryAlerts(),
    staleTime: 2 * 60 * 1000, // 2 minutes (alerts are time-sensitive)
    gcTime: 5 * 60 * 1000,
    retry: 3,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    refetchIntervalInBackground: true,
  });
}

export function useSystemHealth() {
  return useQuery({
    queryKey: adminKeys.systemHealth(),
    queryFn: () => AdminDashboardAPI.getSystemHealth(),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 2 * 60 * 1000,
    retry: 1,
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
    refetchIntervalInBackground: true,
  });
}

// Prefetch utilities for dashboard
export function usePrefetchDashboard() {
  const queryClient = useQueryClient();

  const prefetchMetrics = (filters?: DashboardFilters) => {
    queryClient.prefetchQuery({
      queryKey: adminKeys.metrics(filters),
      queryFn: () => AdminDashboardAPI.getDashboardMetrics(filters),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchRevenue = (filters?: DashboardFilters) => {
    queryClient.prefetchQuery({
      queryKey: adminKeys.revenue(filters),
      queryFn: () => AdminDashboardAPI.getRevenueAnalytics(filters),
      staleTime: 10 * 60 * 1000,
    });
  };

  const prefetchTopProducts = (limit = 10, filters?: DashboardFilters) => {
    queryClient.prefetchQuery({
      queryKey: adminKeys.topProducts(limit, filters),
      queryFn: () => AdminDashboardAPI.getTopProducts(limit, filters),
      staleTime: 15 * 60 * 1000,
    });
  };

  const prefetchSystemHealth = () => {
    queryClient.prefetchQuery({
      queryKey: adminKeys.systemHealth(),
      queryFn: () => AdminDashboardAPI.getSystemHealth(),
      staleTime: 1 * 60 * 1000,
    });
  };

  return {
    prefetchMetrics,
    prefetchRevenue,
    prefetchTopProducts,
    prefetchSystemHealth,
    prefetchAll: (filters?: DashboardFilters) => {
      prefetchMetrics(filters);
      prefetchRevenue(filters);
      prefetchTopProducts(10, filters);
      prefetchSystemHealth();
    }
  };
}

// Cache management utilities
export function useAdminCache() {
  const queryClient = useQueryClient();

  const invalidateMetrics = () => {
    queryClient.invalidateQueries({ queryKey: adminKeys.metrics() });
  };

  const invalidateRevenue = () => {
    queryClient.invalidateQueries({ queryKey: adminKeys.revenue() });
  };

  const invalidateTopProducts = () => {
    queryClient.invalidateQueries({ queryKey: adminKeys.topProducts(10) });
  };

  const invalidateInventory = () => {
    queryClient.invalidateQueries({ queryKey: adminKeys.inventory() });
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: adminKeys.all });
  };

  const refreshDashboard = () => {
    invalidateMetrics();
    invalidateRevenue();
    invalidateTopProducts();
    queryClient.refetchQueries({ queryKey: adminKeys.systemHealth() });
  };

  return {
    invalidateMetrics,
    invalidateRevenue,
    invalidateTopProducts,
    invalidateInventory,
    invalidateAll,
    refreshDashboard
  };
}

// Real-time updates hook
export function useRealtimeUpdates() {
  const { refreshDashboard } = useAdminCache();
  const queryClient = useQueryClient();

  // Simulate real-time updates (in production, this would use WebSockets)
  const enableRealtimeUpdates = (intervalMs = 30000) => { // 30 seconds
    const interval = setInterval(() => {
      // Only refresh if the page is visible
      if (document.visibilityState === 'visible') {
        // Refresh critical data more frequently
        queryClient.invalidateQueries({ queryKey: adminKeys.inventoryAlerts() });
        queryClient.invalidateQueries({ queryKey: adminKeys.systemHealth() });
        
        // Refresh dashboard data less frequently
        if (Math.random() > 0.7) { // 30% chance to avoid too many requests
          refreshDashboard();
        }
      }
    }, intervalMs);

    return () => clearInterval(interval);
  };

  return {
    enableRealtimeUpdates
  };
}

// Dashboard filters hook for state management
export function useDashboardFilters() {
  const [filters, setFilters] = React.useState<DashboardFilters>({
    dateRange: '30days',
    customerType: 'all'
  });

  const updateFilter = (key: keyof DashboardFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      dateRange: '30days',
      customerType: 'all'
    });
  };

  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filters.dateRange) {
      case 'today':
        return { from: today, to: now };
      
      case '7days':
        const week = new Date(today);
        week.setDate(today.getDate() - 7);
        return { from: week, to: now };
      
      case '30days':
        const month = new Date(today);
        month.setDate(today.getDate() - 30);
        return { from: month, to: now };
      
      case '90days':
        const quarter = new Date(today);
        quarter.setDate(today.getDate() - 90);
        return { from: quarter, to: now };
      
      case '1year':
        const year = new Date(today);
        year.setFullYear(today.getFullYear() - 1);
        return { from: year, to: now };
      
      case 'custom':
        return {
          from: filters.customDateFrom || today,
          to: filters.customDateTo || now
        };
      
      default:
        return { from: today, to: now };
    }
  };

  return {
    filters,
    updateFilter,
    resetFilters,
    getDateRange,
    setFilters
  };
}

