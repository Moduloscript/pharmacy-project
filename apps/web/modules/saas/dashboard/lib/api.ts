import { Promotion } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export class DashboardAPI {
  static async getPromotions(): Promise<Promotion[]> {
    const response = await fetch(`${API_BASE}/promotions`);
    if (!response.ok) {
        throw new Error(`Failed to fetch promotions: ${response.statusText}`);
    }
    const result = await response.json();
    if (result.success && result.data) {
        return result.data;
    }
    throw new Error(result.error?.message || 'Failed to fetch promotions');
  }
}
