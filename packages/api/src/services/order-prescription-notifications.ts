import { db } from '@repo/database'
import { 
  NotificationType, 
  NotificationChannel, 
  NotificationStatus, 
  NotificationPriority 
} from '@prisma/client'

/**
 * Phase 1: Send email notification when order requires prescription upload
 * This is triggered after order creation when prescription items are detected
 */
export async function sendPrescriptionRequiredNotification(
  orderId: string,
  customerId: string,
  orderNumber: string,
  prescriptionItems: Array<{ productName: string; productId: string }>
) {
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

    // Format the list of prescription items
    const itemsList = prescriptionItems
      .map(item => `• ${item.productName}`)
      .join('\n')

    // Email content
    const subject = `Action Required: Upload Prescription for Order #${orderNumber}`
    
    const emailMessage = `Dear ${customer.user.name || 'Customer'},

Thank you for your order (#${orderNumber}) with BenPharmacy.

Your order contains the following items that require a valid prescription:

${itemsList}

To complete your order and begin processing, please upload your prescription by:

1. Visit your order details page: https://benpharma.com/app/orders/${orderId}
2. Click on the "Upload Prescription" section
3. Upload a clear photo or PDF of your prescription
4. Fill in the prescribing doctor's details

Your order will remain on hold until our pharmacist verifies your prescription. This usually takes 1-2 hours during business hours.

Important Notes:
• Prescription must be from a licensed healthcare provider
• Prescription should clearly show the prescribed medications
• Prescription must be current (not expired)
• All information must be legible

If you have any questions or need assistance, please contact our support team at support@benpharma.com or call us at +234-XXX-XXXX.

Thank you for choosing BenPharmacy.

Best regards,
The BenPharmacy Team`

    // SMS content (shorter version)
    const smsMessage = `BenPharmacy: Order #${orderNumber} requires prescription upload. Visit benpharma.com/app/orders/${orderId} to upload. Your order is on hold until verified.`

    // Create email notification
    await db.notification.create({
      data: {
        type: NotificationType.PRESCRIPTION_REQUIRED,
        recipient: customer.user.email,
        recipientId: customer.userId,
        recipientEmail: customer.user.email,
        recipientPhone: customer.phone || undefined,
        subject,
        body: emailMessage,
        message: emailMessage, // For backward compatibility
        metadata: {
          orderId,
          orderNumber,
          prescriptionRequired: true,
          prescriptionItems,
          uploadUrl: `https://benpharma.com/app/orders/${orderId}`
        },
        channel: NotificationChannel.EMAIL,
        priority: NotificationPriority.HIGH, // High priority since order is blocked
        status: NotificationStatus.PENDING,
        scheduledFor: new Date(), // Send immediately
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expire in 7 days
      }
    })

    // Check notification preferences for SMS
    const preferences = await db.notificationPreferences.findUnique({
      where: { customerId: customer.id }  // Note: using customerId, not userId
    })

    // Send SMS if enabled and phone number exists
    if (preferences?.smsEnabled && customer.phone) {
      await db.notification.create({
        data: {
          type: NotificationType.PRESCRIPTION_REQUIRED,
          recipient: customer.phone,
          recipientId: customer.userId,
          recipientPhone: customer.phone,
          subject: 'Prescription Required',
          body: smsMessage,
          message: smsMessage, // For backward compatibility
          metadata: {
            orderId,
            orderNumber,
            prescriptionRequired: true,
            isSecondaryNotification: true
          },
          channel: NotificationChannel.SMS,
          priority: NotificationPriority.HIGH,
          status: NotificationStatus.PENDING,
          scheduledFor: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // SMS expires in 24 hours
        }
      })
    }

    console.log(`Prescription required notification sent for Order #${orderNumber}`)
    
    // Send follow-up reminder after 24 hours if prescription not uploaded
    await schedulePrescriptionReminder(orderId, customerId, orderNumber, prescriptionItems)
    
  } catch (error) {
    console.error('Error sending prescription required notification:', error)
  }
}

/**
 * Schedule a reminder notification if prescription is not uploaded within 24 hours
 */
async function schedulePrescriptionReminder(
  orderId: string,
  customerId: string,
  orderNumber: string,
  prescriptionItems: Array<{ productName: string; productId: string }>
) {
  const reminderDate = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
  
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

  if (!customer || !customer.user) return

  const subject = `Reminder: Prescription Still Needed for Order #${orderNumber}`
  
  const emailMessage = `Dear ${customer.user.name || 'Customer'},

This is a friendly reminder that we're still waiting for your prescription for Order #${orderNumber}.

Your order cannot be processed until we receive and verify your prescription.

Upload your prescription now: https://benpharma.com/app/orders/${orderId}

If you no longer wish to proceed with this order, you can cancel it from your order details page.

Need help? Contact us at support@benpharma.com

Best regards,
The BenPharmacy Team`

  // Create scheduled reminder notification
  await db.notification.create({
    data: {
      type: NotificationType.PRESCRIPTION_REMINDER,
      recipient: customer.user.email,
      recipientId: customer.userId,
      recipientEmail: customer.user.email,
      subject,
      body: emailMessage,
      message: emailMessage, // For backward compatibility
      metadata: {
        orderId,
        orderNumber,
        prescriptionRequired: true,
        isReminder: true,
        prescriptionItems,
        uploadUrl: `https://benpharma.com/app/orders/${orderId}`
      },
      channel: NotificationChannel.EMAIL,
      priority: NotificationPriority.NORMAL,
      status: NotificationStatus.SCHEDULED,
      scheduledFor: reminderDate, // Schedule for 24 hours later
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  })
}

/**
 * Cancel scheduled reminder when prescription is uploaded
 */
export async function cancelPrescriptionReminder(orderId: string) {
  try {
    // Find and cancel any scheduled reminders for this order
    await db.notification.updateMany({
      where: {
        status: 'SCHEDULED',
        AND: [
          {
            metadata: {
              path: ['orderId'],
              equals: orderId
            }
          },
          {
            metadata: {
              path: ['isReminder'],
              equals: true
            }
          }
        ]
      },
      data: {
        status: 'CANCELLED',
        metadata: {
          cancelledAt: new Date().toISOString(),
          cancelReason: 'Prescription uploaded'
        }
      }
    })
  } catch (error) {
    console.error('Error cancelling prescription reminder:', error)
  }
}
