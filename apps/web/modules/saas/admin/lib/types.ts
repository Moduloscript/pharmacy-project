export interface DashboardMetrics {
  // Revenue Metrics
  totalRevenue: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
  dailyRevenue: number;
  revenueGrowth: number; // percentage change

  // Order Metrics
  totalOrders: number;
  monthlyOrders: number;
  weeklyOrders: number;
  dailyOrders: number;
  orderGrowth: number; // percentage change
  averageOrderValue: number;

  // Customer Metrics
  totalCustomers: number;
  monthlyNewCustomers: number;
  activeCustomers: number;
  customerRetentionRate: number;
  wholesaleCustomers: number;
  retailCustomers: number;

  // Product Metrics
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  expiringProducts: number;
  topSellingProducts: string[];

  // Inventory Metrics
  totalInventoryValue: number;
  inventoryTurnover: number;
  stockLevels: {
    adequate: number;
    low: number;
    out: number;
  };

  // Performance Metrics
  orderFulfillmentRate: number;
  averageDeliveryTime: number; // in hours
  customerSatisfactionScore: number;
  returnRate: number;
}

export interface RevenueData {
  period: string; // YYYY-MM-DD or YYYY-MM
  revenue: number;
  orders: number;
  averageOrderValue: number;
}

export interface CustomerData {
  period: string;
  newCustomers: number;
  activeCustomers: number;
  totalCustomers: number;
  retentionRate: number;
}

export interface ProductPerformance {
  id: string;
  name: string;
  category: string;
  totalSold: number;
  revenue: number;
  stockLevel: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  lastSaleDate: Date;
}

export interface OrderAnalytics {
  period: string;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  fulfillmentRate: number;
  averageProcessingTime: number; // in hours
}

export interface CustomerAnalytics {
  id: string;
  name: string;
  email: string;
  type: 'RETAIL' | 'WHOLESALE';
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: Date;
  averageOrderValue: number;
  status: 'active' | 'inactive';
  registrationDate: Date;
  creditLimit?: number;
  outstandingBalance?: number;
}

export interface InventoryAlert {
  id: string;
  productId: string;
  productName: string;
  type: 'low_stock' | 'out_of_stock' | 'expiring_soon' | 'expired';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  currentStock: number;
  minimumStock: number;
  expiryDate?: Date;
  daysUntilExpiry?: number;
  createdAt: Date;
}

export interface AdminNotification {
  id: string;
  type: 'order' | 'payment' | 'inventory' | 'customer' | 'system';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  actionRequired: boolean;
  relatedId?: string; // order id, customer id, etc.
  createdAt: Date;
}

export interface DashboardFilters {
  dateRange: 'today' | '7days' | '30days' | '90days' | '1year' | 'custom';
  customDateFrom?: Date;
  customDateTo?: Date;
  customerType?: 'all' | 'retail' | 'wholesale';
  category?: string;
  region?: string;
}

export interface SystemHealth {
  database: {
    status: 'healthy' | 'warning' | 'error';
    responseTime: number; // in ms
    connections: number;
    maxConnections: number;
  };
  api: {
    status: 'healthy' | 'warning' | 'error';
    responseTime: number;
    requestsPerMinute: number;
    errorRate: number; // percentage
  };
  payments: {
    flutterwave: 'online' | 'offline' | 'limited';
    paystack: 'online' | 'offline' | 'limited';
    opay: 'online' | 'offline' | 'limited';
  };
  notifications: {
    whatsapp: 'online' | 'offline' | 'limited';
    sms: 'online' | 'offline' | 'limited';
    email: 'online' | 'offline' | 'limited';
  };
  lastUpdated: Date;
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  action: () => void;
  badge?: {
    count: number;
    variant: 'default' | 'destructive' | 'warning';
  };
}

export interface AdminDashboardState {
  metrics: DashboardMetrics | null;
  revenueData: RevenueData[];
  customerData: CustomerData[];
  orderAnalytics: OrderAnalytics[];
  topProducts: ProductPerformance[];
  inventoryAlerts: InventoryAlert[];
  notifications: AdminNotification[];
  systemHealth: SystemHealth | null;
  filters: DashboardFilters;
  isLoading: boolean;
  lastRefresh: Date | null;
}
