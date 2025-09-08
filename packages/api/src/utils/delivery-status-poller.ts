import { db } from '@repo/database';

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
    gatewayResponse: JSON.stringify({
      ...JSON.parse(await getExistingGatewayResponse(notificationId) || '{}'),
      polledStatus: providerResponse,
      lastPolledAt: new Date().toISOString()
    })
  };
  
  if (internalStatus === 'DELIVERED' && providerResponse.deliveredAt) {\n    updateData.deliveredAt = providerResponse.deliveredAt;\n  } else if (internalStatus === 'SENT') {\n    // Only set sentAt if it hasn't been set before\n    const existing = await db.notification.findUnique({\n      where: { id: notificationId },\n      select: { sentAt: true }\n    });\n    if (existing && !existing.sentAt) {\n      updateData.sentAt = new Date();\n    }\n  }\n  \n  await db.notification.update({\n    where: { id: notificationId },\n    data: updateData\n  });\n  \n  console.log(`📊 Polled status update for notification ${notificationId}: ${internalStatus}`);\n}\n\n/**\n * Get existing gateway response for a notification\n */\nasync function getExistingGatewayResponse(notificationId: string): Promise<string | null> {\n  const notification = await db.notification.findUnique({\n    where: { id: notificationId },\n    select: { gatewayResponse: true }\n  });\n  \n  return notification?.gatewayResponse || null;\n}\n\n/**\n * Poll delivery status for pending notifications\n */\nexport async function pollPendingNotificationStatuses(options: {\n  provider?: string;\n  batchSize?: number;\n  maxAge?: number; // Max age in hours\n  onlyChannels?: string[];\n} = {}) {\n  const {\n    provider = 'termii',\n    batchSize = 50,\n    maxAge = 24, // 24 hours\n    onlyChannels = ['sms']\n  } = options;\n  \n  console.log(`🔍 Polling ${provider} for delivery status updates (batch size: ${batchSize})`);\n  \n  const maxAgeDate = new Date();\n  maxAgeDate.setHours(maxAgeDate.getHours() - maxAge);\n  \n  try {\n    // Find notifications that need status updates\n    const pendingNotifications = await db.notification.findMany({\n      where: {\n        channel: {\n          in: onlyChannels\n        },\n        status: {\n          in: ['PENDING', 'PROCESSING', 'SENT']\n        },\n        createdAt: {\n          gte: maxAgeDate\n        },\n        gatewayResponse: {\n          not: null\n        }\n      },\n      orderBy: {\n        createdAt: 'desc'\n      },\n      take: batchSize\n    });\n    \n    if (pendingNotifications.length === 0) {\n      console.log('✅ No pending notifications found for status polling');\n      return { polled: 0, updated: 0, errors: 0 };\n    }\n    \n    console.log(`📝 Found ${pendingNotifications.length} notifications to poll`);\n    \n    let polled = 0;\n    let updated = 0;\n    let errors = 0;\n    \n    for (const notification of pendingNotifications) {\n      try {\n        // Extract message ID from gateway response\n        const messageId = extractMessageIdFromGatewayResponse(\n          notification.gatewayResponse!,\n          provider\n        );\n        \n        if (!messageId) {\n          console.warn(`⚠️ No message ID found for notification ${notification.id}`);\n          continue;\n        }\n        \n        // Poll the provider\n        let providerResponse: ProviderStatusResponse | null = null;\n        \n        switch (provider) {\n          case 'termii':\n            providerResponse = await pollTermiiStatus(messageId);\n            break;\n          default:\n            console.warn(`Unsupported provider for polling: ${provider}`);\n            continue;\n        }\n        \n        polled++;\n        \n        if (!providerResponse) {\n          console.warn(`⚠️ No status response for notification ${notification.id}`);\n          continue;\n        }\n        \n        // Check if status has changed\n        const newInternalStatus = mapProviderStatusToInternal(providerResponse.status, provider);\n        if (newInternalStatus !== notification.status && newInternalStatus !== 'UNKNOWN') {\n          await updateNotificationWithPolledStatus(\n            notification.id,\n            providerResponse,\n            provider\n          );\n          updated++;\n        }\n        \n        // Add delay between requests to avoid rate limiting\n        if (polled < pendingNotifications.length) {\n          await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay\n        }\n        \n      } catch (error) {\n        console.error(`❌ Error polling status for notification ${notification.id}:`, error);\n        errors++;\n      }\n    }\n    \n    const summary = { polled, updated, errors };\n    console.log(`📊 Status polling completed:`, summary);\n    \n    return summary;\n    \n  } catch (error) {\n    console.error('❌ Error in status polling batch:', error);\n    throw error;\n  }\n}\n\n/**\n * Poll status for a specific notification\n */\nexport async function pollNotificationStatus(notificationId: string, provider = 'termii') {\n  try {\n    const notification = await db.notification.findUnique({\n      where: { id: notificationId },\n      select: {\n        id: true,\n        status: true,\n        channel: true,\n        gatewayResponse: true\n      }\n    });\n    \n    if (!notification) {\n      throw new Error('Notification not found');\n    }\n    \n    if (!notification.gatewayResponse) {\n      throw new Error('No gateway response found - cannot extract message ID');\n    }\n    \n    const messageId = extractMessageIdFromGatewayResponse(notification.gatewayResponse, provider);\n    if (!messageId) {\n      throw new Error('Message ID not found in gateway response');\n    }\n    \n    let providerResponse: ProviderStatusResponse | null = null;\n    \n    switch (provider) {\n      case 'termii':\n        providerResponse = await pollTermiiStatus(messageId);\n        break;\n      default:\n        throw new Error(`Unsupported provider: ${provider}`);\n    }\n    \n    if (!providerResponse) {\n      throw new Error('No response from provider');\n    }\n    \n    const newStatus = mapProviderStatusToInternal(providerResponse.status, provider);\n    \n    if (newStatus !== notification.status && newStatus !== 'UNKNOWN') {\n      await updateNotificationWithPolledStatus(notificationId, providerResponse, provider);\n      return {\n        updated: true,\n        previousStatus: notification.status,\n        newStatus,\n        providerResponse\n      };\n    }\n    \n    return {\n      updated: false,\n      currentStatus: notification.status,\n      providerResponse\n    };\n    \n  } catch (error) {\n    console.error(`❌ Error polling status for notification ${notificationId}:`, error);\n    throw error;\n  }\n}\n\n/**\n * Start periodic status polling (for use in background jobs)\n */\nexport function startPeriodicStatusPolling(intervalMinutes = 10) {\n  console.log(`🔄 Starting periodic status polling every ${intervalMinutes} minutes`);\n  \n  const pollFn = async () => {\n    try {\n      await pollPendingNotificationStatuses();\n    } catch (error) {\n      console.error('❌ Error in periodic status polling:', error);\n    }\n  };\n  \n  // Run immediately\n  pollFn();\n  \n  // Then run periodically\n  const intervalId = setInterval(pollFn, intervalMinutes * 60 * 1000);\n  \n  return () => {\n    console.log('🛑 Stopping periodic status polling');\n    clearInterval(intervalId);\n  };\n}"}}}
