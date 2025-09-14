'use client';

import { Label } from '@ui/components/label';
import { Switch } from '@ui/components/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/components/card';
import { ShieldCheckIcon, AlertTriangleIcon, BellRingIcon } from 'lucide-react';
import type { ExtendedPreferences } from '../PreferenceManager';

interface EmergencySettingsProps {
  preferences: ExtendedPreferences;
  onUpdate: (updates: Partial<ExtendedPreferences>) => void;
}

const emergencyTypes = [
  {
    title: 'Prescription Issues',
    description: 'Critical prescription rejections or clarifications needed',
    icon: AlertTriangleIcon,
    color: 'text-red-500',
  },
  {
    title: 'Payment Failures',
    description: 'Failed payment transactions requiring immediate attention',
    icon: AlertTriangleIcon,
    color: 'text-orange-500',
  },
  {
    title: 'Security Alerts',
    description: 'Account security issues or suspicious activity',
    icon: ShieldCheckIcon,
    color: 'text-purple-500',
  },
  {
    title: 'Order Problems',
    description: 'Critical issues with active orders',
    icon: BellRingIcon,
    color: 'text-blue-500',
  },
];

export function EmergencySettings({ preferences, onUpdate }: EmergencySettingsProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5" />
            Emergency Override
          </CardTitle>
          <CardDescription>
            Allow critical notifications to bypass your preference settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="emergency-override" className="text-base">
                Enable Emergency Override
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Critical notifications will always be delivered, even during quiet hours
              </p>
            </div>
            <Switch
              id="emergency-override"
              checked={preferences.emergencyOverride}
              onCheckedChange={(checked) => onUpdate({ emergencyOverride: checked })}
            />
          </div>

          {preferences.emergencyOverride && (
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <div className="flex items-start gap-3">
                <AlertTriangleIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    Emergency notifications are always enabled
                  </p>
                  <p className="text-amber-700 dark:text-amber-300 mt-1">
                    The following types of notifications will bypass all your settings:
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Emergency Notification Types</CardTitle>
          <CardDescription>
            These notifications are considered critical and may override your preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {emergencyTypes.map((type) => {
              const Icon = type.icon;
              
              return (
                <div
                  key={type.title}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-background"
                >
                  <Icon className={`h-5 w-5 mt-0.5 ${type.color}`} />
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{type.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {type.description}
                    </p>
                  </div>
                  <div className="text-xs font-medium text-green-600 dark:text-green-400">
                    Always On
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Emergency Contact Preferences</CardTitle>
          <CardDescription>
            How we should contact you for emergency notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm font-medium mb-2">Current Emergency Channels:</p>
            <div className="flex gap-2">
              {preferences.smsEnabled && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  SMS
                </span>
              )}
              {preferences.emailEnabled && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                  Email
                </span>
              )}
              {preferences.whatsappEnabled && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  WhatsApp
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Emergency notifications will be sent to all enabled channels simultaneously
            </p>
          </div>

          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">Examples of emergency notifications:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Prescription rejected and requires immediate clarification</li>
              <li>Payment authorization failed for an urgent order</li>
              <li>Suspicious login attempt on your account</li>
              <li>Critical medication recall notice</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
