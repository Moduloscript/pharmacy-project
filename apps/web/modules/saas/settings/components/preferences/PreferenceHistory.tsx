'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/components/card';
import { Button } from '@ui/components/button';
import { Badge } from '@ui/components/badge';
import { 
  HistoryIcon, 
  UndoIcon, 
  CalendarIcon,
  UserIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { notificationApi } from '../../lib/notification-api';
import { toast } from 'sonner';

interface PreferenceHistoryProps {
  userId: string;
}

// Mock history data - in production, this would come from an API
const mockHistory = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    changes: [
      { field: 'quietHoursEnabled', from: false, to: true },
      { field: 'quietHoursStart', from: null, to: '22:00' },
      { field: 'quietHoursEnd', from: null, to: '08:00' },
    ],
    source: 'Manual',
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
    changes: [
      { field: 'smsEnabled', from: false, to: true },
      { field: 'preferredChannel', from: 'email', to: 'sms' },
    ],
    source: 'Manual',
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
    changes: [
      { field: 'promotions', from: true, to: false },
      { field: 'dailyNotificationLimit', from: 30, to: 20 },
    ],
    source: 'Manual',
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 1 month ago
    changes: [
      { field: 'emailEnabled', from: false, to: true },
      { field: 'orderUpdates', from: false, to: true },
      { field: 'deliveryUpdates', from: false, to: true },
    ],
    source: 'Initial Setup',
  },
];

const fieldLabels: Record<string, string> = {
  smsEnabled: 'SMS Notifications',
  emailEnabled: 'Email Notifications',
  whatsappEnabled: 'WhatsApp Notifications',
  orderUpdates: 'Order Updates',
  deliveryUpdates: 'Delivery Updates',
  paymentUpdates: 'Payment Updates',
  promotions: 'Promotional Messages',
  quietHoursEnabled: 'Quiet Hours',
  quietHoursStart: 'Quiet Hours Start',
  quietHoursEnd: 'Quiet Hours End',
  preferredChannel: 'Preferred Channel',
  dailyNotificationLimit: 'Daily Limit',
  emergencyOverride: 'Emergency Override',
};

export function PreferenceHistory({ userId }: PreferenceHistoryProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const data = await notificationApi.getPreferenceHistory(20);
        setHistory(data || mockHistory); // Fall back to mock data if API returns empty
      } catch (error) {
        console.error('Failed to fetch history:', error);
        setHistory(mockHistory); // Use mock data on error
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'Not set';
    if (typeof value === 'boolean') return value ? 'Enabled' : 'Disabled';
    return String(value);
  };

  const getChangeColor = (field: string): string => {
    if (field.includes('Enabled')) return 'bg-blue-100 text-blue-700';
    if (field.includes('quietHours')) return 'bg-purple-100 text-purple-700';
    if (field.includes('Limit')) return 'bg-orange-100 text-orange-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HistoryIcon className="h-5 w-5" />
            Preference History
          </CardTitle>
          <CardDescription>
            View and restore your previous preference settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mockHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No preference changes recorded yet
            </div>
          ) : (
            <div className="space-y-3">
              {mockHistory.map((entry) => {
                const isExpanded = expandedItems.includes(entry.id);
                
                return (
                  <div
                    key={entry.id}
                    className="border rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => toggleExpanded(entry.id)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <div className="text-left">
                          <p className="text-sm font-medium">
                            {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.changes.length} change{entry.changes.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {entry.source}
                        </Badge>
                        {isExpanded ? (
                          <ChevronUpIcon className="h-4 w-4" />
                        ) : (
                          <ChevronDownIcon className="h-4 w-4" />
                        )}
                      </div>
                    </button>
                    
                    {isExpanded && (
                      <div className="px-4 py-3 border-t bg-muted/30">
                        <div className="space-y-2">
                          {entry.changes.map((change, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="font-medium">
                                {fieldLabels[change.field] || change.field}
                              </span>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="secondary"
                                  className={`text-xs ${getChangeColor(change.field)}`}
                                >
                                  {formatValue(change.from)}
                                </Badge>
                                <span className="text-muted-foreground">→</span>
                                <Badge
                                  variant="secondary"
                                  className={`text-xs ${getChangeColor(change.field)}`}
                                >
                                  {formatValue(change.to)}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="mt-3 pt-3 border-t flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // In production, this would restore the preferences
                              console.log('Restore to this point:', entry);
                            }}
                          >
                            <UndoIcon className="h-3 w-3 mr-1" />
                            Restore to this point
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm font-medium">Total Changes</p>
              <p className="text-2xl font-bold">
                {mockHistory.reduce((acc, entry) => acc + entry.changes.length, 0)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm font-medium">Last Updated</p>
              <p className="text-sm mt-1">
                {mockHistory.length > 0
                  ? formatDistanceToNow(mockHistory[0].timestamp, { addSuffix: true })
                  : 'Never'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
