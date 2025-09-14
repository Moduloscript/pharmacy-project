'use client';

import { atom, useAtom } from 'jotai';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@ui/components/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/components/tabs';
import { Button } from '@ui/components/button';
import { 
  BellIcon, 
  SlidersIcon, 
  ClockIcon, 
  ShieldIcon,
  HistoryIcon,
  DownloadIcon,
  UploadIcon,
  EyeIcon
} from 'lucide-react';
import { ChannelPreferences } from './preferences/ChannelPreferences';
import { NotificationTypes } from './preferences/NotificationTypes';
import { QuietHours } from './preferences/QuietHours';
import { FrequencySettings } from './preferences/FrequencySettings';
import { EmergencySettings } from './preferences/EmergencySettings';
import { PreferencePreview } from './preferences/PreferencePreview';
import { PreferenceHistory } from './preferences/PreferenceHistory';
import { ImportExport } from './preferences/ImportExport';
import { useNotificationPreferences } from '../hooks/use-notification-preferences';
import { toast } from 'sonner';
import type { NotificationPreferences } from '@repo/database';

interface PreferenceManagerProps {
  userId: string;
}

// Extended preferences type to include all features
export interface ExtendedPreferences extends NotificationPreferences {
  preferredChannel?: string;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  emergencyOverride?: boolean;
  dailyNotificationLimit?: number;
  weeklyNotificationLimit?: number;
  prescriptionApproval?: boolean;
  prescriptionRejection?: boolean;
  prescriptionClarification?: boolean;
  lowStockAlerts?: boolean;
  channelPriority?: string[];
  digestFrequency?: 'instant' | 'hourly' | 'daily' | 'weekly';
  timezone?: string;
}

const preferencesAtom = atom<ExtendedPreferences | null>(null);
const hasUnsavedChangesAtom = atom(false);

export function PreferenceManager({ userId }: PreferenceManagerProps) {
  const { 
    preferences: serverPreferences, 
    isLoading, 
    isError, 
    updatePreferences, 
    isUpdating 
  } = useNotificationPreferences();
  
  const [localPreferences, setLocalPreferences] = useAtom(preferencesAtom);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useAtom(hasUnsavedChangesAtom);
  const [activeTab, setActiveTab] = useState('channels');
  const [showPreview, setShowPreview] = useState(false);

  // Initialize preferences
  useEffect(() => {
    if (serverPreferences) {
      const extendedPrefs: ExtendedPreferences = {
        ...serverPreferences,
        preferredChannel: serverPreferences.preferredChannel || 'email',
        quietHoursEnabled: serverPreferences.quietHoursEnabled ?? false,
        quietHoursStart: serverPreferences.quietHoursStart || '22:00',
        quietHoursEnd: serverPreferences.quietHoursEnd || '08:00',
        emergencyOverride: serverPreferences.emergencyOverride ?? true,
        dailyNotificationLimit: serverPreferences.dailyNotificationLimit ?? 20,
        weeklyNotificationLimit: serverPreferences.weeklyNotificationLimit ?? 100,
        prescriptionApproval: serverPreferences.prescriptionApproval ?? true,
        prescriptionRejection: serverPreferences.prescriptionRejection ?? true,
        prescriptionClarification: serverPreferences.prescriptionClarification ?? true,
        channelPriority: serverPreferences.channelPriority || ['sms', 'whatsapp', 'email'],
        digestFrequency: serverPreferences.digestFrequency || 'instant',
        timezone: serverPreferences.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      setLocalPreferences(extendedPrefs);
    }
  }, [serverPreferences, setLocalPreferences]);

  const handleUpdatePreferences = (updates: Partial<ExtendedPreferences>) => {
    if (!localPreferences) return;
    
    const updatedPrefs = { ...localPreferences, ...updates };
    setLocalPreferences(updatedPrefs);
    setHasUnsavedChanges(true);
  };

  const handleSaveChanges = async () => {
    if (!localPreferences) return;
    
    try {
      await updatePreferences(localPreferences);
      setHasUnsavedChanges(false);
      toast.success('Your preferences have been saved successfully!');
    } catch (error) {
      toast.error('Failed to save preferences. Please try again.');
    }
  };

  const handleResetToDefaults = () => {
    const defaultPrefs: ExtendedPreferences = {
      id: localPreferences?.id || 'default',
      customerId: localPreferences?.customerId || userId,
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
      createdAt: localPreferences?.createdAt || new Date(),
      updatedAt: new Date()
    };
    
    setLocalPreferences(defaultPrefs);
    setHasUnsavedChanges(true);
    toast.info('Preferences reset to defaults. Remember to save your changes.');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlidersIcon className="h-5 w-5" />
            Communication Preferences
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

  if (!localPreferences) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <SlidersIcon className="h-5 w-5" />
                Communication Preferences
              </CardTitle>
              <CardDescription>
                Manage how and when you receive notifications from us
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                <EyeIcon className="h-4 w-4 mr-1" />
                {showPreview ? 'Hide' : 'Show'} Preview
              </Button>
              <ImportExport 
                preferences={localPreferences}
                onImport={handleUpdatePreferences}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="channels">
                <BellIcon className="h-4 w-4 mr-1" />
                Channels
              </TabsTrigger>
              <TabsTrigger value="types">
                <SlidersIcon className="h-4 w-4 mr-1" />
                Types
              </TabsTrigger>
              <TabsTrigger value="schedule">
                <ClockIcon className="h-4 w-4 mr-1" />
                Schedule
              </TabsTrigger>
              <TabsTrigger value="emergency">
                <ShieldIcon className="h-4 w-4 mr-1" />
                Emergency
              </TabsTrigger>
              <TabsTrigger value="history">
                <HistoryIcon className="h-4 w-4 mr-1" />
                History
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="channels" className="space-y-4 mt-4">
              <ChannelPreferences 
                preferences={localPreferences}
                onUpdate={handleUpdatePreferences}
              />
            </TabsContent>
            
            <TabsContent value="types" className="space-y-4 mt-4">
              <NotificationTypes 
                preferences={localPreferences}
                onUpdate={handleUpdatePreferences}
              />
            </TabsContent>
            
            <TabsContent value="schedule" className="space-y-4 mt-4">
              <QuietHours 
                preferences={localPreferences}
                onUpdate={handleUpdatePreferences}
              />
              <FrequencySettings 
                preferences={localPreferences}
                onUpdate={handleUpdatePreferences}
              />
            </TabsContent>
            
            <TabsContent value="emergency" className="space-y-4 mt-4">
              <EmergencySettings 
                preferences={localPreferences}
                onUpdate={handleUpdatePreferences}
              />
            </TabsContent>
            
            <TabsContent value="history" className="space-y-4 mt-4">
              <PreferenceHistory userId={userId} />
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-between items-center pt-6 mt-6 border-t">
            <Button
              variant="outline"
              onClick={handleResetToDefaults}
            >
              Reset to Defaults
            </Button>
            <div className="flex gap-2">
              {hasUnsavedChanges && (
                <span className="text-sm text-amber-600 flex items-center">
                  You have unsaved changes
                </span>
              )}
              <Button 
                onClick={handleSaveChanges} 
                disabled={isUpdating || !hasUnsavedChanges}
              >
                {isUpdating ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {showPreview && (
        <PreferencePreview preferences={localPreferences} />
      )}
    </div>
  );
}
