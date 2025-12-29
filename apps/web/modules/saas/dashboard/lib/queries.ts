import { useQuery } from '@tanstack/react-query';
import { DashboardAPI } from './api';

export const dashboardKeys = {
  promotions: ['promotions'] as const,
} as const;

export function usePromotions() {
  return useQuery({
    queryKey: dashboardKeys.promotions,
    queryFn: () => DashboardAPI.getPromotions(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
