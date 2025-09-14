'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/components/card';
import { Badge } from '@ui/components/badge';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon, 
  BellIcon,
  AlertCircleIcon,
  InfoIcon
} from 'lucide-react';
import type { ExtendedPreferences } from '../PreferenceManager';

interface PreferencePreviewProps {
  preferences: ExtendedPreferences;
}

const sampleNotifications = [
  {
    type: 'order_confirmation',
    category: 'orderUpdates',
    title: 'Order Confirmation',
    message: 'Your order #12345 has been confirmed',
    priority: 'normal',
    time: '10:30 AM',
  },
  {
    type: 'delivery_update',
    category: 'deliveryUpdates',
    title: 'Out for Delivery',
    message: 'Your package is out for delivery',
    priority: 'normal',
    time: '2:00 PM',
  },
  {
    type: 'payment_failed',
    category: 'paymentUpdates',
    title: 'Payment Failed',
    message: 'Your payment could not be processed',
    priority: 'high',
    time: '11:00 PM',
  },
  {
    type: 'prescription_rejection',
    category: 'prescriptionRejection',
    title: 'Prescription Issue',
    message: 'Your prescription needs clarification',
    priority: 'emergency',
    time: '11:30 PM',
  },
  {
    type: 'promotion',
    category: 'promotions',
    title: 'Special Offer',
    message: '20% off on all vitamins this week',
    priority: 'low',
    time: '9:00 AM',
  },
];

export function PreferencePreview({ preferences }: PreferencePreviewProps) {
  const evaluateNotification = (notification: typeof sampleNotifications[0]) => {
    // Check if category is enabled
    const categoryEnabled = preferences[notification.category as keyof ExtendedPreferences];
    if (!categoryEnabled && notification.priority !== 'emergency') {
      return { allowed: false, reason: 'Notification type disabled' };
    }

    // Check quiet hours
    const notificationHour = parseInt(notification.time.split(':')[0]);
    const isPM = notification.time.includes('PM');
    const hour24 = isPM && notificationHour !== 12 ? notificationHour + 12 : notificationHour;
    
    if (preferences.quietHoursEnabled && notification.priority !== 'emergency') {
      const startHour = parseInt(preferences.quietHoursStart?.split(':')[0] || '22');
      const endHour = parseInt(preferences.quietHoursEnd?.split(':')[0] || '8');
      
      const inQuietHours = startHour > endHour 
        ? (hour24 >= startHour || hour24 < endHour)
        : (hour24 >= startHour && hour24 < endHour);
      
      if (inQuietHours) {
        return { allowed: false, reason: 'Blocked by quiet hours' };
      }
    }

    // Check channel availability
    const hasEnabledChannel = preferences.smsEnabled || preferences.emailEnabled || preferences.whatsappEnabled;
    if (!hasEnabledChannel && notification.priority !== 'emergency') {
      return { allowed: false, reason: 'No channels enabled' };
    }

    // Emergency override
    if (notification.priority === 'emergency' && preferences.emergencyOverride) {
      return { allowed: true, reason: 'Emergency override', channel: 'All channels' };
    }

    // Normal delivery
    const channel = preferences.preferredChannel || 
      (preferences.smsEnabled ? 'SMS' : preferences.emailEnabled ? 'Email' : 'WhatsApp');
    
    return { allowed: true, reason: 'Delivered normally', channel };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellIcon className="h-5 w-5" />
          Notification Preview
        </CardTitle>
        <CardDescription>
          See how your current settings will affect different types of notifications
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sampleNotifications.map((notification) => {
            const result = evaluateNotification(notification);
            
            return (
              <div
                key={notification.type}
                className={`p-4 rounded-lg border ${
                  result.allowed ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{notification.title}</h4>
                      <Badge variant={notification.priority === 'emergency' ? 'destructive' : 'secondary'}>
                        {notification.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <ClockIcon className="h-3 w-3" />
                      {notification.time}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.allowed ? (
                      <>
                        <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <div className="text-right">
                          <p className="text-xs font-medium text-green-700 dark:text-green-300">
                            Will be sent
                          </p>
                          <p className="text-xs text-muted-foreground">
                            via {result.channel}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <XCircleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                        <div className="text-right">
                          <p className="text-xs font-medium text-red-700 dark:text-red-300">
                            Blocked
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {result.reason}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-start gap-2">
            <InfoIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium">Preview Summary</p>
              <ul className="mt-2 space-y-1">
                <li>• Quiet hours: {preferences.quietHoursEnabled ? `${preferences.quietHoursStart} - ${preferences.quietHoursEnd}` : 'Disabled'}</li>
                <li>• Preferred channel: {preferences.preferredChannel || 'Not set'}</li>
                <li>• Emergency override: {preferences.emergencyOverride ? 'Enabled' : 'Disabled'}</li>
                <li>• Daily limit: {preferences.dailyNotificationLimit} notifications</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
