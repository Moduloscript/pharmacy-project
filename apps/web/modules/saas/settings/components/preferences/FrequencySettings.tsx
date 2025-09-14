'use client';

import { useState, useEffect } from 'react';
import { Label } from '@ui/components/label';
import { Slider } from '@ui/components/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/components/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/components/select';
import { CalendarIcon, GaugeIcon, GlobeIcon } from 'lucide-react';
import type { ExtendedPreferences } from '../PreferenceManager';
import { notificationApi } from '../../lib/notification-api';

interface FrequencySettingsProps {
  preferences: ExtendedPreferences;
  onUpdate: (updates: Partial<ExtendedPreferences>) => void;
}

const timezones = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'British Time (GMT)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan Time (JST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
];

export function FrequencySettings({ preferences, onUpdate }: FrequencySettingsProps) {
  const [stats, setStats] = useState({
    dailyCount: 0,
    weeklyCount: 0,
    lastNotificationAt: null as Date | null,
    channelBreakdown: { sms: 0, email: 0, whatsapp: 0 }
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await notificationApi.getNotificationStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GaugeIcon className="h-5 w-5" />
            Notification Limits
          </CardTitle>
          <CardDescription>
            Set maximum number of notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <Label htmlFor="daily-limit">Daily Limit</Label>
                <span className="text-sm font-medium">
                  {preferences.dailyNotificationLimit} notifications
                </span>
              </div>
              <Slider
                id="daily-limit"
                min={1}
                max={50}
                step={1}
                value={[preferences.dailyNotificationLimit || 20]}
                onValueChange={([value]) => onUpdate({ dailyNotificationLimit: value })}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum notifications per day (excluding emergencies)
              </p>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <Label htmlFor="weekly-limit">Weekly Limit</Label>
                <span className="text-sm font-medium">
                  {preferences.weeklyNotificationLimit} notifications
                </span>
              </div>
              <Slider
                id="weekly-limit"
                min={5}
                max={200}
                step={5}
                value={[preferences.weeklyNotificationLimit || 100]}
                onValueChange={([value]) => onUpdate({ weeklyNotificationLimit: value })}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum notifications per week (excluding emergencies)
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted">
            <div className="flex items-start gap-3">
              <CalendarIcon className="h-4 w-4 text-muted-foreground mt-1" />
              <div className="text-sm space-y-1">
                <p className="font-medium">Current Usage</p>
                <p className="text-muted-foreground">
                  Today: {stats.dailyCount} of {preferences.dailyNotificationLimit} notifications
                </p>
                <p className="text-muted-foreground">
                  This week: {stats.weeklyCount} of {preferences.weeklyNotificationLimit} notifications
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Digest Preferences</CardTitle>
          <CardDescription>
            Choose how often to receive bundled notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="digest-frequency">Digest Frequency</Label>
            <Select
              value={preferences.digestFrequency}
              onValueChange={(value: any) => onUpdate({ digestFrequency: value })}
            >
              <SelectTrigger id="digest-frequency">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instant">Instant (No digest)</SelectItem>
                <SelectItem value="hourly">Hourly digest</SelectItem>
                <SelectItem value="daily">Daily digest</SelectItem>
                <SelectItem value="weekly">Weekly digest</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Non-urgent notifications will be bundled and sent at this frequency
            </p>
          </div>

          {preferences.digestFrequency !== 'instant' && (
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {preferences.digestFrequency === 'hourly' && 
                  "You'll receive a summary every hour with any pending notifications"}
                {preferences.digestFrequency === 'daily' && 
                  "You'll receive a daily summary at 9 AM with all non-urgent notifications"}
                {preferences.digestFrequency === 'weekly' && 
                  "You'll receive a weekly summary on Mondays with all non-urgent notifications"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GlobeIcon className="h-5 w-5" />
            Timezone
          </CardTitle>
          <CardDescription>
            Set your timezone for accurate notification scheduling
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={preferences.timezone}
            onValueChange={(value) => onUpdate({ timezone: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {timezones.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-2">
            All scheduled notifications will be sent according to this timezone
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
