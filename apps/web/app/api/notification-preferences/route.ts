import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@saas/auth/lib/server';
import { db } from '@repo/database';
import { z } from 'zod';

// Validation schema for preferences
const PreferencesSchema = z.object({
  smsEnabled: z.boolean().optional(),
  whatsappEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  orderUpdates: z.boolean().optional(),
  paymentUpdates: z.boolean().optional(),
  deliveryUpdates: z.boolean().optional(),
  promotions: z.boolean().optional(),
  lowStockAlerts: z.boolean().optional(),
  prescriptionApproval: z.boolean().optional(),
  prescriptionRejection: z.boolean().optional(),
  prescriptionClarification: z.boolean().optional(),
  preferredChannel: z.string().optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  quietHoursEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  emergencyOverride: z.boolean().optional(),
  dailyNotificationLimit: z.number().min(1).max(100).optional(),
  weeklyNotificationLimit: z.number().min(1).max(500).optional(),
  channelPriority: z.array(z.string()).optional(),
  digestFrequency: z.enum(['instant', 'hourly', 'daily', 'weekly']).optional(),
  timezone: z.string().optional(),
});

// GET /api/notification-preferences
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Resolve the Customer for this user
    const customer = await db.customer.findUnique({ where: { userId: session.user.id } });
    if (!customer) {
      return NextResponse.json(
        { error: 'Customer profile not found for user' },
        { status: 404 }
      );
    }

    // Get or create preferences for the customer
    let preferences = await db.notificationPreferences.findUnique({
      where: { customerId: customer.id },
    });

    if (!preferences) {
      // Create default preferences
      preferences = await db.notificationPreferences.create({
        data: {
          customerId: customer.id,
          smsEnabled: true,
          emailEnabled: true,
          whatsappEnabled: false,
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
          timezone: 'UTC',
        },
      });
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

// PUT /api/notification-preferences
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate the input
    const validationResult = PreferencesSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid preferences data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Resolve the Customer for this user
    const customer = await db.customer.findUnique({ where: { userId: session.user.id } });
    if (!customer) {
      return NextResponse.json(
        { error: 'Customer profile not found for user' },
        { status: 404 }
      );
    }

    // Get existing preferences for comparison
    const existingPrefs = await db.notificationPreferences.findUnique({
      where: { customerId: customer.id },
    });

    // Update preferences
    const updatedPreferences = await db.notificationPreferences.upsert({
      where: { customerId: customer.id },
      update: {
        ...validationResult.data,
        updatedAt: new Date(),
      },
      create: {
        customerId: customer.id,
        ...validationResult.data,
      },
    });

    // Log the changes
    if (existingPrefs) {
      const changes: Record<string, { from: any; to: any }> = {};
      
      Object.entries(validationResult.data).forEach(([key, value]) => {
        const oldValue = (existingPrefs as any)[key];
        if (oldValue !== value) {
          changes[key] = { from: oldValue, to: value };
        }
      });

      if (Object.keys(changes).length > 0) {
        // await db.notificationPreferenceHistory.create({
        //   data: {
        //     customerId: customer.id,
        //     changes,
        //     source: 'manual',
        //   },
        // });
      }
    }

    return NextResponse.json(updatedPreferences);
  } catch (error) {
    console.error('Error updating preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
