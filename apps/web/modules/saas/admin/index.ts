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
  RevenueAnalytics,
  TopProduct,
  InventoryAlert,
  SystemHealth,
  DashboardFilters
} from './lib/types';

// API
export { AdminAPI, AdminUtils } from './lib/api';

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
