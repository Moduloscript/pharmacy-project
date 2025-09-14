import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotificationPreferenceChecker } from '../notification-preference-checker';
import { db } from '@repo/database';
import type { NotificationPreferences, Customer } from '@prisma/client';

// Mock the database module
vi.mock('@repo/database', () => ({
  db: {
    notificationPreferences: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    notificationOptOut: {
      findFirst: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    notificationRateLimit: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    customer: {
      findUnique: vi.fn(),
    },
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe('NotificationPreferenceChecker', () => {
  const mockCustomerId = 'customer-123';
  const mockPreferences: Partial<NotificationPreferences> = {
    id: 'pref-123',
    customerId: mockCustomerId,
    smsEnabled: true,
    whatsappEnabled: true,
    emailEnabled: true,
    orderUpdates: true,
    paymentUpdates: true,
    deliveryUpdates: true,
    promotions: false,
    prescriptionApproval: true,
    prescriptionRejection: true,
    prescriptionClarification: true,
    quietHoursEnabled: false,
    quietHoursStart: null,
    quietHoursEnd: null,
    dailyNotificationLimit: 10,
    emergencyOverride: true,
    preferredChannel: 'sms',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset date mocks
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15 14:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('checkNotificationAllowed', () => {
    it('should allow notification when all checks pass', async () => {
      vi.mocked(db.notificationPreferences.findUnique).mockResolvedValue(mockPreferences as any);
      vi.mocked(db.notificationOptOut.findFirst).mockResolvedValue(null);
      vi.mocked(db.notificationRateLimit.findFirst).mockResolvedValue(null);

      const result = await NotificationPreferenceChecker.checkNotificationAllowed({
        customerId: mockCustomerId,
        channel: 'sms',
        type: 'order_confirmation',
        priority: 'normal',
      });

      expect(result.allowed).toBe(true);
      expect(result.preferredChannel).toBe('sms');
    });

    it('should block notification when channel is disabled', async () => {
      const disabledSmsPrefs = { ...mockPreferences, smsEnabled: false };
      vi.mocked(db.notificationPreferences.findUnique).mockResolvedValue(disabledSmsPrefs as any);

      const result = await NotificationPreferenceChecker.checkNotificationAllowed({
        customerId: mockCustomerId,
        channel: 'sms',
        type: 'order_confirmation',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('sms notifications are disabled');
    });

    it('should block notification when type is disabled', async () => {
      const disabledOrderPrefs = { ...mockPreferences, orderUpdates: false };
      vi.mocked(db.notificationPreferences.findUnique).mockResolvedValue(disabledOrderPrefs as any);

      const result = await NotificationPreferenceChecker.checkNotificationAllowed({
        customerId: mockCustomerId,
        channel: 'sms',
        type: 'order_confirmation',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('order_confirmation notifications are disabled');
    });

    it('should block notification when customer has opted out', async () => {
      vi.mocked(db.notificationPreferences.findUnique).mockResolvedValue(mockPreferences as any);
      vi.mocked(db.notificationOptOut.findFirst).mockResolvedValue({
        id: 'opt-out-123',
        customerId: mockCustomerId,
        channel: 'SMS',
        type: 'ALL',
      } as any);

      const result = await NotificationPreferenceChecker.checkNotificationAllowed({
        customerId: mockCustomerId,
        channel: 'sms',
        type: 'order_confirmation',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('opted out');
      expect(result.optedOut).toBe(true);
    });

    it('should respect quiet hours when enabled', async () => {
      const quietHoursPrefs = {
        ...mockPreferences,
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        emergencyOverride: false,
      };
      vi.mocked(db.notificationPreferences.findUnique).mockResolvedValue(quietHoursPrefs as any);
      vi.mocked(db.notificationOptOut.findFirst).mockResolvedValue(null);

      // Set time to 23:00 (within quiet hours)
      vi.setSystemTime(new Date('2024-01-15 23:00:00'));

      const result = await NotificationPreferenceChecker.checkNotificationAllowed({
        customerId: mockCustomerId,
        channel: 'sms',
        type: 'order_confirmation',
        isEmergency: false,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('quiet hours');
      expect(result.quietHoursActive).toBe(true);
    });

    it('should allow emergency notifications during quiet hours when override is enabled', async () => {
      const quietHoursPrefs = {
        ...mockPreferences,
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        emergencyOverride: true,
      };
      vi.mocked(db.notificationPreferences.findUnique).mockResolvedValue(quietHoursPrefs as any);
      vi.mocked(db.notificationOptOut.findFirst).mockResolvedValue(null);
      vi.mocked(db.notificationRateLimit.findFirst).mockResolvedValue(null);

      // Set time to 23:00 (within quiet hours)
      vi.setSystemTime(new Date('2024-01-15 23:00:00'));

      const result = await NotificationPreferenceChecker.checkNotificationAllowed({
        customerId: mockCustomerId,
        channel: 'sms',
        type: 'prescription_rejected',
        isEmergency: true,
      });

      expect(result.allowed).toBe(true);
    });

    it('should enforce rate limits', async () => {
      vi.mocked(db.notificationPreferences.findUnique).mockResolvedValue(mockPreferences as any);
      vi.mocked(db.notificationOptOut.findFirst).mockResolvedValue(null);
      vi.mocked(db.notificationRateLimit.findFirst).mockResolvedValue({
        id: 'rate-limit-123',
        customerId: mockCustomerId,
        notificationType: 'order_confirmation',
        count: 10,
        exceeded: false,
        windowStart: new Date('2024-01-15 00:00:00'),
        windowEnd: new Date('2024-01-15 23:59:59'),
      } as any);

      const result = await NotificationPreferenceChecker.checkNotificationAllowed({
        customerId: mockCustomerId,
        channel: 'sms',
        type: 'order_confirmation',
        priority: 'normal',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Daily notification limit exceeded');
      expect(result.rateLimitExceeded).toBe(true);
    });

    it('should allow high priority notifications even when rate limit exceeded', async () => {
      vi.mocked(db.notificationPreferences.findUnique).mockResolvedValue(mockPreferences as any);
      vi.mocked(db.notificationOptOut.findFirst).mockResolvedValue(null);
      vi.mocked(db.notificationRateLimit.findFirst).mockResolvedValue({
        id: 'rate-limit-123',
        customerId: mockCustomerId,
        notificationType: 'payment_success',
        count: 10,
        exceeded: true,
        windowStart: new Date('2024-01-15 00:00:00'),
        windowEnd: new Date('2024-01-15 23:59:59'),
      } as any);

      const result = await NotificationPreferenceChecker.checkNotificationAllowed({
        customerId: mockCustomerId,
        channel: 'sms',
        type: 'payment_success',
        priority: 'high',
      });

      expect(result.allowed).toBe(true);
    });

    it('should allow notifications when no preferences exist (defaults)', async () => {
      vi.mocked(db.notificationPreferences.findUnique).mockResolvedValue(null);
      vi.mocked(db.notificationOptOut.findFirst).mockResolvedValue(null);

      const result = await NotificationPreferenceChecker.checkNotificationAllowed({
        customerId: mockCustomerId,
        channel: 'sms',
        type: 'order_confirmation',
      });

      expect(result.allowed).toBe(true);
    });
  });

  describe('getBestChannel', () => {
    it('should return preferred channel when enabled', async () => {
      vi.mocked(db.notificationPreferences.findUnique).mockResolvedValue({
        preferredChannel: 'whatsapp',
        smsEnabled: true,
        whatsappEnabled: true,
        emailEnabled: true,
      } as any);

      const channel = await NotificationPreferenceChecker.getBestChannel(
        mockCustomerId,
        'sms'
      );

      expect(channel).toBe('whatsapp');
    });

    it('should fallback to enabled channel when preferred is disabled', async () => {
      vi.mocked(db.notificationPreferences.findUnique).mockResolvedValue({
        preferredChannel: 'whatsapp',
        smsEnabled: true,
        whatsappEnabled: false, // Preferred but disabled
        emailEnabled: true,
      } as any);

      const channel = await NotificationPreferenceChecker.getBestChannel(
        mockCustomerId,
        'sms'
      );

      expect(channel).toBe('sms');
    });

    it('should return default channel when no preferences exist', async () => {
      vi.mocked(db.notificationPreferences.findUnique).mockResolvedValue(null);

      const channel = await NotificationPreferenceChecker.getBestChannel(
        mockCustomerId,
        'email'
      );

      expect(channel).toBe('email');
    });
  });

  describe('recordNotificationSent', () => {
    it('should create new rate limit record for first notification', async () => {
      const mockUpsert = vi.mocked(db.notificationRateLimit.upsert);
      
      await NotificationPreferenceChecker.recordNotificationSent(
        mockCustomerId,
        'order_confirmation'
      );

      expect(mockUpsert).toHaveBeenCalledWith({
        where: {
          customerId_notificationType_windowStart: {
            customerId: mockCustomerId,
            notificationType: 'order_confirmation',
            windowStart: expect.any(Date),
          },
        },
        update: expect.objectContaining({
          count: { increment: 1 },
        }),
        create: expect.objectContaining({
          customerId: mockCustomerId,
          notificationType: 'order_confirmation',
          count: 1,
        }),
      });
    });
  });

  describe('cleanupOldRateLimits', () => {
    it('should delete rate limit records older than 3 days', async () => {
      const mockDeleteMany = vi.mocked(db.notificationRateLimit.deleteMany);
      mockDeleteMany.mockResolvedValue({ count: 5 });

      const deletedCount = await NotificationPreferenceChecker.cleanupOldRateLimits();

      expect(deletedCount).toBe(5);
      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: {
          windowEnd: { lt: expect.any(Date) },
        },
      });
    });
  });

  describe('Quiet Hours Edge Cases', () => {
    it('should handle quiet hours spanning midnight correctly', async () => {
      const quietHoursPrefs = {
        ...mockPreferences,
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '06:00',
        emergencyOverride: false,
      };
      vi.mocked(db.notificationPreferences.findUnique).mockResolvedValue(quietHoursPrefs as any);
      vi.mocked(db.notificationOptOut.findFirst).mockResolvedValue(null);

      // Test at 23:00 (should be in quiet hours)
      vi.setSystemTime(new Date('2024-01-15 23:00:00'));
      let result = await NotificationPreferenceChecker.checkNotificationAllowed({
        customerId: mockCustomerId,
        channel: 'sms',
        type: 'order_confirmation',
      });
      expect(result.allowed).toBe(false);
      expect(result.quietHoursActive).toBe(true);

      // Test at 05:00 (should be in quiet hours)
      vi.setSystemTime(new Date('2024-01-16 05:00:00'));
      result = await NotificationPreferenceChecker.checkNotificationAllowed({
        customerId: mockCustomerId,
        channel: 'sms',
        type: 'order_confirmation',
      });
      expect(result.allowed).toBe(false);
      expect(result.quietHoursActive).toBe(true);

      // Test at 07:00 (should be outside quiet hours)
      vi.setSystemTime(new Date('2024-01-16 07:00:00'));
      vi.mocked(db.notificationRateLimit.findFirst).mockResolvedValue(null);
      result = await NotificationPreferenceChecker.checkNotificationAllowed({
        customerId: mockCustomerId,
        channel: 'sms',
        type: 'order_confirmation',
      });
      expect(result.allowed).toBe(true);
      expect(result.quietHoursActive).toBe(undefined);
    });
  });

  describe('Prescription Notification Types', () => {
    it('should respect prescription approval preferences', async () => {
      const prefs = { ...mockPreferences, prescriptionApproval: false };
      vi.mocked(db.notificationPreferences.findUnique).mockResolvedValue(prefs as any);

      const result = await NotificationPreferenceChecker.checkNotificationAllowed({
        customerId: mockCustomerId,
        channel: 'sms',
        type: 'prescription_approved',
      });

      expect(result.allowed).toBe(false);
    });

    it('should respect prescription rejection preferences', async () => {
      const prefs = { ...mockPreferences, prescriptionRejection: false };
      vi.mocked(db.notificationPreferences.findUnique).mockResolvedValue(prefs as any);

      const result = await NotificationPreferenceChecker.checkNotificationAllowed({
        customerId: mockCustomerId,
        channel: 'email',
        type: 'prescription_rejected',
      });

      expect(result.allowed).toBe(false);
    });

    it('should respect prescription clarification preferences', async () => {
      const prefs = { ...mockPreferences, prescriptionClarification: false };
      vi.mocked(db.notificationPreferences.findUnique).mockResolvedValue(prefs as any);

      const result = await NotificationPreferenceChecker.checkNotificationAllowed({
        customerId: mockCustomerId,
        channel: 'whatsapp',
        type: 'prescription_clarification',
      });

      expect(result.allowed).toBe(false);
    });
  });
});
