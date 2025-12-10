'use client';

import { atom, useAtom } from 'jotai';
import { useEffect, useState } from 'react';
import { useNotificationPreferences } from '../hooks/use-notification-preferences';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@ui/components/card';
import { Label } from '@ui/components/label';
import { Switch } from '@ui/components/switch';
import { Button } from '@ui/components/button';
import { BellIcon, InfoIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@ui/components/alert';
import type { NotificationPreferences } from '@repo/database';

// Create a Jotai atom to hold the local state of the preferences
const preferencesAtom = atom<NotificationPreferences | null>(null);

export function NotificationSettings() {
  const { preferences: serverPreferences, isLoading, isError, updatePreferences, isUpdating } = useNotificationPreferences();
  const [localPreferences, setLocalPreferences] = useAtom(preferencesAtom);

  // When server data arrives, update the Jotai atom
  useEffect(() => {
    if (serverPreferences) {
      setLocalPreferences(serverPreferences);
    }
  }, [serverPreferences, setLocalPreferences]);

  const handleToggle = (key: keyof NotificationPreferences) => {
    if (!localPreferences) return;
    setLocalPreferences({ ...localPreferences, [key]: !localPreferences[key] });
  };

  const handleSaveChanges = () => {
    if (!localPreferences) return;
    updatePreferences(localPreferences);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellIcon className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading your preferences...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If there's an error or no preferences, show default UI
  if (isError || !localPreferences) {
    // Use default preferences if API is not available
    const defaultPrefs: NotificationPreferences = {
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
      prescriptionApproval: true,
      prescriptionRejection: true,
      prescriptionClarification: true,
      preferredChannel: 'email',
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      emergencyOverride: true,
      dailyNotificationLimit: 20,
      weeklyNotificationLimit: 100,
      channelPriority: ['sms', 'whatsapp', 'email'],
      digestFrequency: 'instant',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    if (!localPreferences) {
      setLocalPreferences(defaultPrefs);
      return null; // Re-render with default preferences
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellIcon className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Manage how you receive updates about your orders and account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isError && (
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              Notification settings are currently in demo mode. Changes will be saved locally.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-sm mb-3">Notification Channels</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Choose how you want to receive notifications
            </p>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="email-notifications" className="text-base">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive updates via email</p>
            </div>
            <Switch
              id="email-notifications"
              checked={localPreferences.emailEnabled}
              onCheckedChange={() => handleToggle('emailEnabled')}
            />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="sms-notifications" className="text-base">SMS Notifications</Label>
              <p className="text-sm text-muted-foreground">Get text messages for important updates</p>
            </div>
            <Switch
              id="sms-notifications"
              checked={localPreferences.smsEnabled}
              onCheckedChange={() => handleToggle('smsEnabled')}
            />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="whatsapp-notifications" className="text-base">WhatsApp Notifications</Label>
              <p className="text-sm text-muted-foreground">Coming soon - Rich media updates via WhatsApp</p>
            </div>
            <Switch
              id="whatsapp-notifications"
              checked={localPreferences.whatsappEnabled}
              onCheckedChange={() => handleToggle('whatsappEnabled')}
              disabled // Disabled until WhatsApp integration is complete
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-sm mb-3">Notification Types</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select which types of updates you want to receive
            </p>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="order-updates" className="text-base">Order Updates</Label>
              <p className="text-sm text-muted-foreground">Order confirmations and status changes</p>
            </div>
            <Switch
              id="order-updates"
              checked={localPreferences.orderUpdates}
              onCheckedChange={() => handleToggle('orderUpdates')}
            />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="delivery-updates" className="text-base">Delivery Updates</Label>
              <p className="text-sm text-muted-foreground">Shipping and delivery notifications</p>
            </div>
            <Switch
              id="delivery-updates"
              checked={localPreferences.deliveryUpdates}
              onCheckedChange={() => handleToggle('deliveryUpdates')}
            />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="payment-updates" className="text-base">Payment Updates</Label>
              <p className="text-sm text-muted-foreground">Payment confirmations and receipts</p>
            </div>
            <Switch
              id="payment-updates"
              checked={localPreferences.paymentUpdates}
              onCheckedChange={() => handleToggle('paymentUpdates')}
            />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="promotions" className="text-base">Promotions & Marketing</Label>
              <p className="text-sm text-muted-foreground">Special offers and announcements</p>
            </div>
            <Switch
              id="promotions"
              checked={localPreferences.promotions}
              onCheckedChange={() => handleToggle('promotions')}
            />
          </div>
        </div>

        <div className="pt-4 border-t">
          <Button onClick={handleSaveChanges} disabled={isUpdating} className="w-full sm:w-auto">
            {isUpdating ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

