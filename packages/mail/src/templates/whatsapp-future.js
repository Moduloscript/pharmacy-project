/**
 * WhatsApp Templates - DEFERRED TO PHASE 2
 *
 * These templates will be implemented when WhatsApp Business API
 * verification is complete and Meta Business Manager approval is obtained.
 *
 * Currently, all notifications are sent via SMS (Termii).
 */
/**
 * Future WhatsApp templates requiring Meta Business Manager approval
 * Rich media support, interactive buttons, and enhanced formatting
 */
export const whatsappTemplatesFuture = [
    {
        name: 'order_confirmation_v1',
        channel: 'whatsapp',
        requiredParams: ['customer_name', 'order_number', 'total_amount', 'delivery_address', 'tracking_url'],
        preview: '🏥 *BenPharm Order Confirmation*\n\nHello {{customer_name}}, your order #{{order_number}} has been confirmed!\n\n💰 Total: ₦{{total_amount}}\n📍 Delivery: {{delivery_address}}\n🔗 Track: {{tracking_url}}\n\n[View Order] [Contact Support]'
    },
    {
        name: 'payment_success_v1',
        channel: 'whatsapp',
        requiredParams: ['order_number', 'amount', 'method'],
        preview: '✅ *Payment Confirmed!*\n\nOrder #{{order_number}}\n💰 ₦{{amount}} via {{method}}\n\nYour order is being processed. Thank you for choosing BenPharm!'
    },
    {
        name: 'delivery_update_v1',
        channel: 'whatsapp',
        requiredParams: ['order_number', 'status_label', 'eta_or_notes'],
        preview: '🚚 *Delivery Update*\n\nOrder #{{order_number}} is {{status_label}}.\n{{eta_or_notes}}\n\n[Track Package] [Contact Driver]'
    },
    {
        name: 'low_stock_alert_admin_v1',
        channel: 'whatsapp',
        requiredParams: ['product_name', 'current_stock', 'recommended_action'],
        preview: '⚠️ *STOCK ALERT*\n\n{{product_name}}\nCurrent stock: {{current_stock}}\n\n{{recommended_action}}\n\n[View Inventory] [Create PO]'
    },
    {
        name: 'prescription_required_v1',
        channel: 'whatsapp',
        requiredParams: ['order_number', 'product_names', 'upload_link'],
        preview: '📋 *Prescription Required*\n\nOrder #{{order_number}} contains:\n{{product_names}}\n\nPlease upload your prescription:\n{{upload_link}}\n\n[Upload Now] [Contact Pharmacist]'
    },
    {
        name: 'order_ready_pickup_v1',
        channel: 'whatsapp',
        requiredParams: ['customer_name', 'order_number', 'pickup_location', 'pickup_hours'],
        preview: '✅ *Order Ready for Pickup!*\n\nHi {{customer_name}}, Order #{{order_number}} is ready!\n\n📍 {{pickup_location}}\n🕐 {{pickup_hours}}\n\n[Get Directions] [Confirm Pickup]'
    }
];
/**
 * WhatsApp template message generators for fallback/testing
 * These will be used when the official templates are approved
 */
export const whatsappMessagesFuture = {
    order_confirmation: (params) => `🏥 *BenPharm Order Confirmation*\n\nHello ${params.customer_name}!\n\n✅ Your order has been confirmed:\n\n📦 Order #${params.order_number}\n💰 Total: ₦${params.total_amount}\n🏠 Delivery: ${params.delivery_address}\n\n📱 Track your order: ${params.tracking_url}\n\nThank you for choosing BenPharm Online!`,
    payment_success: (params) => `✅ *Payment Confirmed!*\n\n📦 Order #${params.order_number}\n💰 Amount: ₦${params.amount}\n💳 Method: ${params.method}\n\n🔄 Your order is being processed and will be ready soon.\n\nThank you for your business!`,
    delivery_update: (params) => `🚚 *Delivery Update*\n\n📦 Order #${params.order_number}\n📍 Status: ${params.status_label}\n⏰ ${params.eta_or_notes}\n\nFor assistance, reply to this message or call our support line.`,
    low_stock_alert: (params) => `⚠️ *STOCK ALERT*\n\n🏥 ${params.product_name}\n📊 Current Stock: ${params.current_stock}\n\n🔔 ${params.recommended_action}\n\nView inventory dashboard: ${params.dashboard_url}`,
    prescription_upload: (params) => `📋 *Prescription Required*\n\nDear ${params.customer_name},\n\nYour order #${params.order_number} contains prescription medications.\n\nPlease upload your prescription here:\n${params.upload_link}\n\nOur pharmacist will review it within 30 minutes.`,
    promotional: (params) => `🎉 *Special Offer from BenPharm!*\n\n${params.offer_title}\n\n${params.offer_description}\n\n💊 Valid until: ${params.expiry_date}\n🏃 Use code: ${params.promo_code}\n\nShop now: ${params.shop_url}`
};
/**
 * WhatsApp configuration for future implementation
 */
export const whatsappConfig = {
    // Template approval status tracking
    templateStatus: {
        order_confirmation_v1: 'pending',
        payment_success_v1: 'pending',
        delivery_update_v1: 'pending',
        low_stock_alert_admin_v1: 'pending',
        prescription_required_v1: 'pending',
        order_ready_pickup_v1: 'pending'
    },
    // Media types supported
    supportedMedia: ['image/jpeg', 'image/png', 'application/pdf'],
    // Interactive components
    interactiveFeatures: {
        buttons: true,
        lists: true,
        quickReplies: true,
        catalogs: false // Requires additional setup
    },
    // Rate limits (Meta imposed)
    rateLimits: {
        businessInitiated: 1000, // per day for unverified
        userInitiated24h: 'unlimited', // within 24h window
        templateMessages: 250000 // per day for verified
    }
};
/**
 * Migration notes for WhatsApp implementation
 *
 * Prerequisites:
 * 1. Meta Business verification completed
 * 2. WhatsApp Business Account approved
 * 3. Phone number verified and registered
 * 4. Templates submitted and approved
 * 5. Webhook endpoints configured
 * 6. Test environment validated
 *
 * Implementation steps:
 * 1. Enable NOTIFICATIONS_WHATSAPP_ENABLED=true
 * 2. Configure WhatsApp credentials in .env
 * 3. Uncomment webhook routes in packages/api/src/routes/webhooks.ts
 * 4. Import templates from this file to main templates/index.ts
 * 5. Update NotificationService to route to WhatsApp based on user preferences
 * 6. Implement delivery status tracking via webhooks
 * 7. Add media attachment support via Supabase Storage
 * 8. Enable interactive message components
 * 9. Implement conversation session management
 * 10. Add cost tracking for WhatsApp conversations
 */
