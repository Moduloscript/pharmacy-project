import { apiClient } from "@shared/lib/api-client";
import { createQueryKeyWithParams } from "@shared/lib/query-client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  DashboardMetrics,
  RevenueData,
  CustomerData,
  ProductPerformance,
  OrderAnalytics,
  CustomerAnalytics,
  InventoryAlert,
  AdminNotification,
  SystemHealth,
  DashboardFilters
} from './types';

/*
 * Admin users
 */
type FetchAdminUsersParams = {
	itemsPerPage: number;
	currentPage: number;
	searchTerm: string;
};

export const adminUsersQueryKey = ["admin", "users"];
export const fetchAdminUsers = async ({
	itemsPerPage,
	currentPage,
	searchTerm,
}: FetchAdminUsersParams) => {
	const response = await apiClient.admin.users.$get({
		query: {
			limit: itemsPerPage.toString(),
			offset: ((currentPage - 1) * itemsPerPage).toString(),
			query: searchTerm,
		},
	});

	if (!response.ok) {
		throw new Error("Could not fetch users");
	}

	return response.json();
};
export const useAdminUsersQuery = (params: FetchAdminUsersParams) => {
	return useQuery({
		queryKey: createQueryKeyWithParams(adminUsersQueryKey, params),
		queryFn: () => fetchAdminUsers(params),
		retry: false,
		refetchOnWindowFocus: false,
		placeholderData: keepPreviousData,
	});
};

/*
 * Admin organizations
 */
type FetchAdminOrganizationsParams = {
	itemsPerPage: number;
	currentPage: number;
	searchTerm: string;
};
export const adminOrganizationsQueryKey = ["admin", "organizations"];
export const fetchAdminOrganizations = async ({
	itemsPerPage,
	currentPage,
	searchTerm,
}: FetchAdminOrganizationsParams) => {
	const response = await apiClient.admin.organizations.$get({
		query: {
			limit: itemsPerPage.toString(),
			offset: ((currentPage - 1) * itemsPerPage).toString(),
			query: searchTerm,
		},
	});

	if (!response.ok) {
		throw new Error("Could not fetch organizations");
	}

	return response.json();
};
export const useAdminOrganizationsQuery = (
	params: FetchAdminOrganizationsParams,
) => {
	return useQuery({
		queryKey: createQueryKeyWithParams(adminOrganizationsQueryKey, params),
		queryFn: () => fetchAdminOrganizations(params),
		retry: false,
		refetchOnWindowFocus: false,
		placeholderData: keepPreviousData,
	});
};

/*
 * Admin Dashboard API
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export class AdminDashboardAPI {
  /**
   * Get dashboard metrics overview
   */
  static async getDashboardMetrics(filters?: DashboardFilters): Promise<DashboardMetrics> {
    const params = new URLSearchParams();
    
    if (filters) {
      params.append('dateRange', filters.dateRange);
      if (filters.customDateFrom) {
        params.append('dateFrom', filters.customDateFrom.toISOString());
      }
      if (filters.customDateTo) {
        params.append('dateTo', filters.customDateTo.toISOString());
      }
      if (filters.customerType && filters.customerType !== 'all') {
        params.append('customerType', filters.customerType);
      }
      if (filters.category) {
        params.append('category', filters.category);
      }
      if (filters.region) {
        params.append('region', filters.region);
      }
    }

    const response = await fetch(`${API_BASE}/admin/dashboard/metrics?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard metrics: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Get revenue analytics data
   */
  static async getRevenueAnalytics(filters?: DashboardFilters): Promise<RevenueData[]> {
    const params = new URLSearchParams();
    
    if (filters) {
      params.append('dateRange', filters.dateRange);
      if (filters.customDateFrom) {
        params.append('dateFrom', filters.customDateFrom.toISOString());
      }
      if (filters.customDateTo) {
        params.append('dateTo', filters.customDateTo.toISOString());
      }
    }

    const response = await fetch(`${API_BASE}/admin/dashboard/revenue-analytics?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch revenue analytics: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Get top performing products
   */
  static async getTopProducts(limit = 10, filters?: DashboardFilters): Promise<ProductPerformance[]> {
    const params = new URLSearchParams({
      limit: limit.toString()
    });
    
    if (filters) {
      params.append('dateRange', filters.dateRange);
      if (filters.customDateFrom) {
        params.append('dateFrom', filters.customDateFrom.toISOString());
      }
      if (filters.customDateTo) {
        params.append('dateTo', filters.customDateTo.toISOString());
      }
      if (filters.category) {
        params.append('category', filters.category);
      }
    }

    const response = await fetch(`${API_BASE}/admin/dashboard/top-products?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch top products: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.map((item: any) => ({
      ...item,
      lastSaleDate: new Date(item.lastSaleDate)
    }));
  }

  /**
   * Get inventory alerts
   */
  static async getInventoryAlerts(): Promise<InventoryAlert[]> {
    const response = await fetch(`${API_BASE}/admin/dashboard/inventory-alerts`);
    if (!response.ok) {
      throw new Error(`Failed to fetch inventory alerts: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.map((alert: any) => ({
      ...alert,
      expiryDate: alert.expiryDate ? new Date(alert.expiryDate) : undefined,
      createdAt: new Date(alert.createdAt)
    }));
  }

  /**
   * Get system health status
   */
  static async getSystemHealth(): Promise<SystemHealth> {
    const response = await fetch(`${API_BASE}/admin/dashboard/system-health`);
    if (!response.ok) {
      throw new Error(`Failed to fetch system health: ${response.statusText}`);
    }
    
    const data = await response.json();
    return {
      ...data,
      lastUpdated: new Date(data.lastUpdated)
    };
  }
}

// Utility functions
export const AdminUtils = {
  /**
   * Format currency for Nigerian Naira
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  },

  /**
   * Format percentage
   */
  formatPercentage(value: number, decimals = 1): string {
    return `${value.toFixed(decimals)}%`;
  },

  /**
   * Get growth indicator
   */
  getGrowthIndicator(growth: number): {
    color: string;
    icon: 'up' | 'down' | 'stable';
    text: string;
  } {
    if (growth > 0) {
      return {
        color: 'text-green-600',
        icon: 'up',
        text: `+${this.formatPercentage(growth)}`
      };
    } else if (growth < 0) {
      return {
        color: 'text-red-600',
        icon: 'down',
        text: this.formatPercentage(growth)
      };
    } else {
      return {
        color: 'text-gray-600',
        icon: 'stable',
        text: '0%'
      };
    }
  },

  /**
   * Get severity color for alerts
   */
  getSeverityColor(severity: 'low' | 'medium' | 'high' | 'critical'): string {
    const colors = {
      low: 'text-blue-600 bg-blue-50',
      medium: 'text-yellow-600 bg-yellow-50',
      high: 'text-orange-600 bg-orange-50',
      critical: 'text-red-600 bg-red-50'
    };
    return colors[severity];
  },

  /**
   * Get system status color
   */
  getStatusColor(status: 'healthy' | 'warning' | 'error' | 'online' | 'offline' | 'limited'): string {
    const colors = {
      healthy: 'text-green-600 bg-green-50',
      online: 'text-green-600 bg-green-50',
      warning: 'text-yellow-600 bg-yellow-50',
      limited: 'text-yellow-600 bg-yellow-50',
      error: 'text-red-600 bg-red-50',
      offline: 'text-red-600 bg-red-50'
    };
    return colors[status];
  }
};
