import type { NotificationPreferences } from '@repo/database';

// Get the API base URL
const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
};

export const notificationApi = {
  getPreferences: async (): Promise<NotificationPreferences> => {
    try {
      const response = await fetch(`${getApiUrl()}/api/notification-preferences`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.warn('Failed to fetch preferences, using defaults');
        // Return default preferences if API fails
        return {
          id: 'default',
          customerId: 'default',
          smsEnabled: true,
          whatsappEnabled: false,
          emailEnabled: true,
          orderUpdates: true,
          paymentUpdates: true,
          deliveryUpdates: true,
          promotions: false,
          lowStockAlerts: false,
          createdAt: new Date(),
          updatedAt: new Date()
        } as NotificationPreferences;
      }
      
      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      // Return default preferences if API fails
      return {
        id: 'default',
        customerId: 'default',
        smsEnabled: true,
        whatsappEnabled: false,
        emailEnabled: true,
        orderUpdates: true,
        paymentUpdates: true,
        deliveryUpdates: true,
        promotions: false,
        lowStockAlerts: false,
        createdAt: new Date(),
        updatedAt: new Date()
      } as NotificationPreferences;
    }
  },

  updatePreferences: async (preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> => {
    try {
      const response = await fetch(`${getApiUrl()}/api/notification-preferences`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }
      
      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  },

  getPreferenceHistory: async (limit: number = 20) => {
    try {
      const response = await fetch(`${getApiUrl()}/api/notification-preferences/history?limit=${limit}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch preference history');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching preference history:', error);
      return [];
    }
  },

  getNotificationStats: async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/notification-preferences/stats`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch notification stats');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      return {
        dailyCount: 0,
        weeklyCount: 0,
        lastNotificationAt: null,
        channelBreakdown: { sms: 0, email: 0, whatsapp: 0 }
      };
    }
  },

  testNotification: async (channel: string, type: string) => {
    try {
      const response = await fetch(`${getApiUrl()}/api/notification-preferences/test`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channel, type }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send test notification');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  },
};

