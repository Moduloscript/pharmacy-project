// Components
export { AdminDashboard } from './components/AdminDashboard';
export { 
  MetricsCard,
  RevenueCard,
  OrdersCard,
  CustomersCard,
  InventoryCard
} from './components/MetricsCard';

// Types
export type {
  DashboardMetrics,
  RevenueData as RevenueAnalytics,
  ProductPerformance as TopProduct,
  InventoryAlert,
  SystemHealth,
  DashboardFilters
} from './lib/types';

// API
export { AdminDashboardAPI as AdminAPI, AdminUtils } from './lib/api';

// Query hooks
export {
  useDashboardMetrics,
  useRevenueAnalytics,
  useTopProducts,
  useInventoryAlerts,
  useSystemHealth,
  useDashboardFilters,
  useRealtimeUpdates,
  useAdminCache
} from './lib/queries';
