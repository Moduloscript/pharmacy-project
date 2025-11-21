import { db, NotificationChannelType } from '@repo/database';

/**
 * Delivery Status Polling Utilities
 * 
 * Polls notification providers for delivery status updates
 * Useful as backup when webhooks are unreliable or not configured
 */

interface ProviderStatusResponse {
  messageId: string;
  status: string;
  deliveredAt?: Date;
  failureReason?: string;
}

/**
 * Poll Termii API for message delivery status
 */
async function pollTermiiStatus(messageId: string): Promise<ProviderStatusResponse | null> {
  const apiKey = process.env.TERMII_API_KEY;
  if (!apiKey) {
    console.warn('TERMII_API_KEY not configured for status polling');
    return null;
  }
  
  try {
    // Termii status endpoint (check their API docs for exact endpoint)
    const response = await fetch(`https://api.termii.com/api/sms/status/${messageId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey
      })
    });
    
    if (!response.ok) {
      console.warn(`Termii status API returned ${response.status}:`, await response.text());
      return null;
    }
    
    const data = await response.json();
    
    return {
      messageId: messageId,
      status: data.status || 'unknown',
      deliveredAt: data.delivered_at ? new Date(data.delivered_at) : undefined,
      failureReason: data.error || data.failure_reason
    };
    
  } catch (error) {
    console.error('Error polling Termii status:', error);
    return null;
  }
}

/**
 * Map provider status to internal status
 */
function mapProviderStatusToInternal(providerStatus: string, provider: string): string {
  switch (provider) {
    case 'termii':
      switch (providerStatus.toLowerCase()) {
        case 'delivered':
          return 'DELIVERED';
        case 'failed':
        case 'expired':
        case 'rejected':
          return 'FAILED';
        case 'sent':
          return 'SENT';
        default:
          return 'UNKNOWN';
      }
    default:
      return 'UNKNOWN';
  }
}

/**
 * Extract message ID from gateway response
 */
function extractMessageIdFromGatewayResponse(gatewayResponse: string, provider: string): string | null {
  try {
    const response = JSON.parse(gatewayResponse);
    
    switch (provider) {
      case 'termii':
        return response.message_id || response.messageId || null;
      default:
        return null;
    }
  } catch (error) {
    console.warn('Error parsing gateway response for message ID:', error);
    return null;
  }
}

/**
 * Update notification with polled status
 */
async function updateNotificationWithPolledStatus(
  notificationId: string,
  providerResponse: ProviderStatusResponse,
  provider: string
) {
  const internalStatus = mapProviderStatusToInternal(providerResponse.status, provider);
  
  const updateData: any = {
    status: internalStatus,
  };

  // Merge gateway response with previous stored response (if any)
  try {
    const existingStr = (await getExistingGatewayResponse(notificationId)) || '{}';
    const existing = JSON.parse(existingStr);
    updateData.gatewayResponse = JSON.stringify({
      ...existing,
      polledStatus: providerResponse,
      lastPolledAt: new Date().toISOString(),
    });
  } catch {
    updateData.gatewayResponse = JSON.stringify({
      polledStatus: providerResponse,
      lastPolledAt: new Date().toISOString(),
    });
  }

  if (internalStatus === 'DELIVERED' && providerResponse.deliveredAt) {
    updateData.deliveredAt = providerResponse.deliveredAt;
  } else if (internalStatus === 'SENT') {
    // Only set sentAt if it hasn't been set before
    const existing = await db.notification.findUnique({
      where: { id: notificationId },
      select: { sentAt: true },
    });
    if (existing && !existing.sentAt) {
      updateData.sentAt = new Date();
    }
  }

  await db.notification.update({
    where: { id: notificationId },
    data: updateData,
  });

  console.log(
    `📊 Polled status update for notification ${notificationId}: ${internalStatus}`,
  );
}

/**
 * Get existing gateway response for a notification
 */
async function getExistingGatewayResponse(
  notificationId: string,
): Promise<string | null> {
  const notification = await db.notification.findUnique({
    where: { id: notificationId },
    select: { gatewayResponse: true },
  });

  return notification?.gatewayResponse || null;
}

/**
 * Poll delivery status for pending notifications
 */
export async function pollPendingNotificationStatuses(options: {
  provider?: string;
  batchSize?: number;
  maxAge?: number; // Max age in hours
  onlyChannels?: NotificationChannelType[];
} = {}) {
  const {
    provider = 'termii',
    batchSize = 50,
    maxAge = 24, // 24 hours
    onlyChannels = ['SMS']
  } = options;

  console.log(
    `🔍 Polling ${provider} for delivery status updates (batch size: ${batchSize})`,
  );

  const maxAgeDate = new Date();
  maxAgeDate.setHours(maxAgeDate.getHours() - maxAge);

  try {
    // Find notifications that need status updates
    const pendingNotifications = await db.notification.findMany({
      where: {
        channel: {
          in: onlyChannels,
        },
        status: {
          in: ['PENDING', 'SENT'],
        },
        createdAt: {
          gte: maxAgeDate,
        },
        gatewayResponse: {
          not: null,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: batchSize,
    });

    if (pendingNotifications.length === 0) {
      console.log('✅ No pending notifications found for status polling');
      return { polled: 0, updated: 0, errors: 0 };
    }

    console.log(`📝 Found ${pendingNotifications.length} notifications to poll`);

    let polled = 0;
    let updated = 0;
    let errors = 0;

    for (const notification of pendingNotifications) {
      try {
        // Extract message ID from gateway response
        const messageId = extractMessageIdFromGatewayResponse(
          notification.gatewayResponse!,
          provider,
        );

        if (!messageId) {
          console.warn(`⚠️ No message ID found for notification ${notification.id}`);
          continue;
        }

        // Poll the provider
        let providerResponse: ProviderStatusResponse | null = null;

        switch (provider) {
          case 'termii':
            providerResponse = await pollTermiiStatus(messageId);
            break;
          default:
            console.warn(`Unsupported provider for polling: ${provider}`);
            continue;
        }

        polled++;

        if (!providerResponse) {
          console.warn(
            `⚠️ No status response for notification ${notification.id}`,
          );
          continue;
        }

        // Check if status has changed
        const newInternalStatus = mapProviderStatusToInternal(
          providerResponse.status,
          provider,
        );
        if (
          newInternalStatus !== notification.status &&
          newInternalStatus !== 'UNKNOWN'
        ) {
          await updateNotificationWithPolledStatus(
            notification.id,
            providerResponse,
            provider,
          );
          updated++;
        }

        // Add delay between requests to avoid rate limiting
        if (polled < pendingNotifications.length) {
          await new Promise((resolve) => setTimeout(resolve, 200)); // 200ms delay
        }
      } catch (error) {
        console.error(
          `❌ Error polling status for notification ${notification.id}:`,
          error,
        );
        errors++;
      }
    }

    const summary = { polled, updated, errors };
    console.log(`📊 Status polling completed:`, summary);

    return summary;
  } catch (error) {
    console.error('❌ Error in status polling batch:', error);
    throw error;
  }
}

/**
 * Poll status for a specific notification
 */
export async function pollNotificationStatus(
  notificationId: string,
  provider = 'termii',
) {
  try {
    const notification = await db.notification.findUnique({
      where: { id: notificationId },
      select: {
        id: true,
        status: true,
        channel: true,
        gatewayResponse: true,
      },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    if (!notification.gatewayResponse) {
      throw new Error('No gateway response found - cannot extract message ID');
    }

    const messageId = extractMessageIdFromGatewayResponse(
      notification.gatewayResponse,
      provider,
    );
    if (!messageId) {
      throw new Error('Message ID not found in gateway response');
    }

    let providerResponse: ProviderStatusResponse | null = null;

    switch (provider) {
      case 'termii':
        providerResponse = await pollTermiiStatus(messageId);
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    if (!providerResponse) {
      throw new Error('No response from provider');
    }

    const newStatus = mapProviderStatusToInternal(
      providerResponse.status,
      provider,
    );

    if (newStatus !== notification.status && newStatus !== 'UNKNOWN') {
      await updateNotificationWithPolledStatus(
        notificationId,
        providerResponse,
        provider,
      );
      return {
        updated: true,
        previousStatus: notification.status,
        newStatus,
        providerResponse,
      };
    }

    return {
      updated: false,
      currentStatus: notification.status,
      providerResponse,
    };
  } catch (error) {
    console.error(
      `❌ Error polling status for notification ${notificationId}:`,
      error,
    );
    throw error;
  }
}

/**
 * Start periodic status polling (for use in background jobs)
 */
export function startPeriodicStatusPolling(intervalMinutes = 10) {
  console.log(
    `🔄 Starting periodic status polling every ${intervalMinutes} minutes`,
  );

  const pollFn = async () => {
    try {
      await pollPendingNotificationStatuses();
    } catch (error) {
      console.error('❌ Error in periodic status polling:', error);
    }
  };

  // Run immediately
  pollFn();

  // Then run periodically
  const intervalId = setInterval(pollFn, intervalMinutes * 60 * 1000);

  return () => {
    console.log('🛑 Stopping periodic status polling');
    clearInterval(intervalId);
  };
}
