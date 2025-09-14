import { db } from '@repo/database'
import { addNotificationJob } from '@repo/queue'
import { NotificationPreferenceChecker } from './notification-preference-checker'
import type { NotificationJobData } from '@repo/queue'
import {
  NotificationType as PrismaNotificationType,
  NotificationChannel as PrismaNotificationChannel,
  NotificationPriority as PrismaNotificationPriority,
  NotificationStatus as PrismaNotificationStatus,
} from '@prisma/client'

interface PrescriptionNotificationData {
  prescriptionId: string
  orderId: string
  customerId: string
  orderNumber: string
  status: 'APPROVED' | 'REJECTED' | 'CLARIFICATION'
  reason?: string
  clarificationRequest?: string
  pharmacistName?: string
}

// Helpers to map strings to Prisma enums
function mapType(type: string): PrismaNotificationType {
  switch ((type || '').toLowerCase()) {
    case 'prescription_approved':
      return PrismaNotificationType.PRESCRIPTION_APPROVED
    case 'prescription_rejected':
      return PrismaNotificationType.PRESCRIPTION_REJECTED
    case 'prescription_required':
      return PrismaNotificationType.PRESCRIPTION_REQUIRED
    case 'prescription_reminder':
      return PrismaNotificationType.PRESCRIPTION_REMINDER
    // There is no dedicated PRESCRIPTION_CLARIFICATION enum; use SYSTEM_ALERT for now
    case 'prescription_clarification':
      return PrismaNotificationType.SYSTEM_ALERT
    default:
      return PrismaNotificationType.SYSTEM_ALERT
  }
}

function mapChannel(channel: string): PrismaNotificationChannel {
  switch ((channel || '').toLowerCase()) {
    case 'email':
      return PrismaNotificationChannel.EMAIL
    case 'sms':
      return PrismaNotificationChannel.SMS
    case 'whatsapp':
      return PrismaNotificationChannel.WHATSAPP
    default:
      return PrismaNotificationChannel.EMAIL
  }
}

function mapPriority(priority: string): PrismaNotificationPriority {
  switch ((priority || '').toLowerCase()) {
    case 'high':
      return PrismaNotificationPriority.HIGH
    case 'urgent':
      return PrismaNotificationPriority.URGENT
    case 'normal':
    default:
      return PrismaNotificationPriority.NORMAL
  }
}

export async function sendPrescriptionStatusNotification(data: PrescriptionNotificationData) {
  const { 
    prescriptionId, 
    orderId, 
    customerId, 
    orderNumber, 
    status, 
    reason, 
    clarificationRequest,
    pharmacistName
  } = data

  try {
    // Get customer details
    const customer = await db.customer.findUnique({
      where: { id: customerId },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })
    if (!customer || !customer.user) {
      console.error('Customer not found for prescription notification:', customerId)
      return
    }

    // Map status to notification type
    const notificationTypeMap = {
      'APPROVED': 'prescription_approved',
      'REJECTED': 'prescription_rejected',
      'CLARIFICATION': 'prescription_clarification'
    }
    
    const notificationType = notificationTypeMap[status]
    if (!notificationType) {
      console.error('Invalid prescription status:', status)
      return
    }

    // Determine priority based on status
    const priority = status === 'REJECTED' || status === 'CLARIFICATION' ? 'high' : 'normal'
    const isEmergency = status === 'REJECTED' // Rejections might be time-sensitive

    // Prepare notification content based on status
    let subject: string
    let message: string
    let smsMessage: string

    switch (status) {
      case 'APPROVED':
        subject = `Prescription Approved - Order #${orderNumber}`
        message = `Great news! Your prescription for Order #${orderNumber} has been approved by our pharmacist${pharmacistName ? ` (${pharmacistName})` : ''}. Your order is now being processed and will be shipped soon.`
        smsMessage = `BenPharmacy: Your prescription for Order #${orderNumber} has been approved. Your order is being processed. Track at benpharma.com/orders`
        break

      case 'REJECTED':
        subject = `Prescription Review - Order #${orderNumber}`
        message = `Your prescription for Order #${orderNumber} could not be approved. Reason: ${reason || 'The prescription does not meet our requirements'}. Please contact your healthcare provider for a new prescription or reach out to our support team for assistance.`
        smsMessage = `BenPharmacy: Your prescription for Order #${orderNumber} needs attention. Please check your email or visit benpharma.com/orders for details.`
        break

      case 'CLARIFICATION':
        subject = `Clarification Needed - Order #${orderNumber}`
        message = `Our pharmacist needs additional information about your prescription for Order #${orderNumber}. ${clarificationRequest || 'Please provide additional details about your prescription.'}. You can respond by replying to this email or contacting our support team.`
        smsMessage = `BenPharmacy: We need more info about your prescription for Order #${orderNumber}. Please check your email or call us.`
        break

      default:
        return
    }

    // Channels to attempt in order of preference
    const channelsToTry = ['email', 'sms', 'whatsapp']
    const notificationsSent = []
    
    for (const channel of channelsToTry) {
      // Check if this channel is allowed
      const preferenceCheck = await NotificationPreferenceChecker.checkNotificationAllowed({
        customerId,
        channel,
        type: notificationType,
        priority,
        isEmergency
      })

      if (!preferenceCheck.allowed) {
        console.log(`❌ ${channel} notification blocked for customer ${customerId}: ${preferenceCheck.reason}`)
        continue
      }

      // Skip if no contact info for this channel
      if (channel === 'email' && !customer.user.email) continue
      if ((channel === 'sms' || channel === 'whatsapp') && !customer.phone) continue

      // Create notification record
      const notificationMessage = channel === 'email' ? message : smsMessage;
      const notification = await db.notification.create({
        data: {
          customerId,
          prescriptionId,
          orderId,
          type: mapType(notificationType),
          channel: mapChannel(channel),
          recipient: channel === 'email' ? customer.user.email! : customer.phone!,
          subject,
          message: notificationMessage,
          body: notificationMessage, // Required field
          status: PrismaNotificationStatus.PENDING,
          priority: mapPriority(priority),
          metadata: {
            orderId,
            prescriptionId,
            orderNumber,
            status,
            reason,
            clarificationRequest,
            pharmacistName,
            customerName: customer.user.name,
            businessName: customer.businessName
          }
        }
      })

      // Queue the notification for processing
      const jobData: NotificationJobData = {
        notificationId: notification.id,
        type: notificationType as any,
        channel: channel as any,
        recipient: notification.recipient,
        template: `prescription_${status.toLowerCase()}`,
        templateParams: {
          customerName: customer.user.name,
          orderNumber,
          pharmacistName,
          reason,
          clarificationRequest,
          businessName: customer.businessName
        },
        priority: priority as any
      }

      await addNotificationJob(notificationType, jobData, {
        attempts: 3,
        priority: getPriority(priority)
      })

      // Record that we sent this notification
      await NotificationPreferenceChecker.recordNotificationSent(customerId, notificationType)
      
      notificationsSent.push(notification)
      console.log(`✅ Queued ${channel} prescription ${status.toLowerCase()} notification for Order #${orderNumber}`)

      // If email was sent successfully, we might skip SMS unless it's high priority
      if (channel === 'email' && priority !== 'high') {
        break
      }
    }

    if (notificationsSent.length === 0) {
      console.error(`⚠️ No notifications could be sent for prescription ${prescriptionId} - all channels blocked or unavailable`)
    }

    return notificationsSent[0] // Return the first notification sent

  } catch (error) {
    console.error('Error sending prescription notification:', error)
    throw error
  }
}

// Helper function to get priority number for queue
function getPriority(priority: string): number {
  switch (priority) {
    case 'high': return 1;
    case 'normal': return 5;
    case 'low': return 10;
    default: return 5;
  }
}

// Helper function to notify admin/pharmacist about new prescriptions
export async function notifyPharmacistOfNewPrescription(orderId: string, orderNumber: string) {
  try {
    // Get all admin users with pharmacist role
    const adminUsers = await db.user.findMany({
      where: {
        role: 'admin',
        // You might want to add a specific field for pharmacist notifications
      },
      select: {
        id: true,
        email: true,
        name: true
      }
    })

    // Create notifications for each pharmacist
    for (const admin of adminUsers) {
      // For admins, we don't check preferences - they need to see all prescriptions
      const msg = `A new prescription has been submitted for Order #${orderNumber} and requires pharmacist verification. Please review it in the Prescription Verification Dashboard.`
      const notification = await db.notification.create({
        data: {
          type: PrismaNotificationType.SYSTEM_ALERT,
          channel: PrismaNotificationChannel.EMAIL,
          recipient: admin.email,
          subject: `New Prescription to Review - Order #${orderNumber}`,
          message: msg,
          body: msg,
          status: PrismaNotificationStatus.PENDING,
          priority: PrismaNotificationPriority.HIGH,
          metadata: {
            orderId,
            orderNumber,
            dashboardUrl: '/app/admin/prescriptions',
            recipientId: admin.id,
            recipientName: admin.name
          }
        }
      })

      // Queue the notification
      const jobData: NotificationJobData = {
        notificationId: notification.id,
        type: 'system_alert' as any,
        channel: 'email',
        recipient: admin.email,
        template: 'admin_prescription_alert',
        templateParams: {
          adminName: admin.name,
          orderNumber,
          dashboardUrl: '/app/admin/prescriptions'
        },
        priority: 'high'
      }

      await addNotificationJob('system_alert', jobData, {
        attempts: 3,
        priority: 1 // High priority for admin alerts
      })
    }

    console.log(`🔔 Notified ${adminUsers.length} admin(s) about new prescription for Order #${orderNumber}`)
  } catch (error) {
    console.error('Error notifying pharmacists:', error)
    // Don't throw - this shouldn't stop the prescription submission
  }
}
