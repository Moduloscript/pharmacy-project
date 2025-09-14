'use client';

import { Label } from '@ui/components/label';
import { Switch } from '@ui/components/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/components/card';
import { 
  ShoppingCartIcon, 
  CreditCardIcon, 
  TruckIcon, 
  TagIcon,
  FileTextIcon,
  AlertCircleIcon,
  PackageIcon
} from 'lucide-react';
import type { ExtendedPreferences } from '../PreferenceManager';

interface NotificationTypesProps {
  preferences: ExtendedPreferences;
  onUpdate: (updates: Partial<ExtendedPreferences>) => void;
}

const notificationCategories = [
  {
    title: 'Orders & Purchases',
    icon: ShoppingCartIcon,
    types: [
      {
        key: 'orderUpdates',
        label: 'Order Updates',
        description: 'Order confirmations, status changes, and cancellations',
      },
    ],
  },
  {
    title: 'Delivery & Shipping',
    icon: TruckIcon,
    types: [
      {
        key: 'deliveryUpdates',
        label: 'Delivery Updates',
        description: 'Shipping confirmations, tracking updates, and delivery notifications',
      },
    ],
  },
  {
    title: 'Payments & Billing',
    icon: CreditCardIcon,
    types: [
      {
        key: 'paymentUpdates',
        label: 'Payment Updates',
        description: 'Payment confirmations, failed transactions, and refunds',
      },
    ],
  },
  {
    title: 'Prescriptions',
    icon: FileTextIcon,
    types: [
      {
        key: 'prescriptionApproval',
        label: 'Prescription Approvals',
        description: 'Notifications when your prescription is approved',
      },
      {
        key: 'prescriptionRejection',
        label: 'Prescription Rejections',
        description: 'Alerts when a prescription needs attention',
      },
      {
        key: 'prescriptionClarification',
        label: 'Clarification Requests',
        description: 'When pharmacist needs additional information',
      },
    ],
  },
  {
    title: 'Marketing & Promotions',
    icon: TagIcon,
    types: [
      {
        key: 'promotions',
        label: 'Promotional Offers',
        description: 'Special deals, discounts, and seasonal offers',
      },
    ],
  },
  {
    title: 'Stock & Availability',
    icon: PackageIcon,
    types: [
      {
        key: 'lowStockAlerts',
        label: 'Low Stock Alerts',
        description: 'Notifications when your regular items are running low',
      },
    ],
  },
];

export function NotificationTypes({ preferences, onUpdate }: NotificationTypesProps) {
  const handleToggle = (key: string) => {
    onUpdate({ [key]: !preferences[key as keyof ExtendedPreferences] });
  };

  // Count enabled notifications
  const totalTypes = notificationCategories.reduce(
    (acc, cat) => acc + cat.types.length,
    0
  );
  const enabledTypes = notificationCategories.reduce(
    (acc, cat) =>
      acc + cat.types.filter((type) => preferences[type.key as keyof ExtendedPreferences]).length,
    0
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>
            Choose which types of notifications you want to receive
          </CardDescription>
          <div className="mt-2">
            <span className="text-sm text-muted-foreground">
              {enabledTypes} of {totalTypes} notification types enabled
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {notificationCategories.map((category) => {
            const Icon = category.icon;
            const categoryEnabled = category.types.some(
              (type) => preferences[type.key as keyof ExtendedPreferences]
            );

            return (
              <div key={category.title} className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-sm">{category.title}</h3>
                  {!categoryEnabled && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      All disabled
                    </span>
                  )}
                </div>
                <div className="space-y-3 pl-6">
                  {category.types.map((type) => {
                    const enabled = preferences[type.key as keyof ExtendedPreferences];
                    
                    return (
                      <div
                        key={type.key}
                        className="flex items-start justify-between py-2"
                      >
                        <div className="flex-1 mr-4">
                          <Label
                            htmlFor={type.key}
                            className="text-base font-medium cursor-pointer"
                          >
                            {type.label}
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {type.description}
                          </p>
                        </div>
                        <Switch
                          id={type.key}
                          checked={enabled as boolean}
                          onCheckedChange={() => handleToggle(type.key)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <button
            onClick={() => {
              const updates: any = {};
              notificationCategories.forEach((cat) => {
                cat.types.forEach((type) => {
                  updates[type.key] = true;
                });
              });
              onUpdate(updates);
            }}
            className="px-4 py-2 text-sm font-medium rounded-md border hover:bg-accent"
          >
            Enable All
          </button>
          <button
            onClick={() => {
              const updates: any = {};
              notificationCategories.forEach((cat) => {
                cat.types.forEach((type) => {
                  updates[type.key] = false;
                });
              });
              onUpdate(updates);
            }}
            className="px-4 py-2 text-sm font-medium rounded-md border hover:bg-accent"
          >
            Disable All
          </button>
          <button
            onClick={() => {
              const updates: any = {};
              // Enable only essential notifications
              updates.orderUpdates = true;
              updates.deliveryUpdates = true;
              updates.paymentUpdates = true;
              updates.prescriptionApproval = true;
              updates.prescriptionRejection = true;
              updates.prescriptionClarification = true;
              updates.promotions = false;
              updates.lowStockAlerts = false;
              onUpdate(updates);
            }}
            className="px-4 py-2 text-sm font-medium rounded-md border hover:bg-accent"
          >
            Essential Only
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
