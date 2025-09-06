import type { NotificationTemplate } from '../provider/notifications';

/**
 * Nigerian pharmacy notification templates
 * PRIMARY: SMS templates via Termii (active)
 * FUTURE: WhatsApp templates (deferred to Phase 2)
 */
export const notificationTemplates: NotificationTemplate[] = [
	// SMS templates (PRIMARY - immediate use, no approval needed)
	{
		name: 'order_confirmation_sms',
		channel: 'sms',
		requiredParams: ['order_number', 'total_amount', 'tracking_url'],
		preview: 'Order #{{order_number}} confirmed! ₦{{total_amount}}. Track: {{tracking_url}} - BenPharm'
	},
	{
		name: 'payment_success_sms',
		channel: 'sms',
		requiredParams: ['order_number', 'amount', 'method'],
		preview: 'Payment received: Order #{{order_number}} - ₦{{amount}} via {{method}}. Thank you! - BenPharm'
	},
	{
		name: 'delivery_update_sms',
		channel: 'sms',
		requiredParams: ['order_number', 'status_label'],
		optionalParams: ['eta_or_notes'],
		preview: 'Order #{{order_number}} {{status_label}}. {{eta_or_notes}} - BenPharm'
	},
	{
		name: 'low_stock_alert_admin_sms',
		channel: 'sms',
		requiredParams: ['product_name', 'current_stock'],
		preview: 'STOCK ALERT: {{product_name}} low ({{current_stock}}). Action needed - BenPharm'
	},
	{
		name: 'business_verification_sms',
		channel: 'sms',
		requiredParams: ['business_name', 'status'],
		preview: 'Business verification for {{business_name}}: {{status}}. Contact support if needed - BenPharm'
	},

	// Email templates (secondary channel)
	{
		name: 'order_confirmation_email',
		channel: 'email' as any, // Type extension needed
		requiredParams: ['customer_name', 'order_number', 'total_amount', 'order_items'],
		preview: 'Order confirmation email with detailed invoice'
	}
];

// WhatsApp templates moved to ./whatsapp-future.ts (Phase 2)

/**
 * Template message content for different channels
 * PRIMARY: SMS templates
 * FUTURE: WhatsApp templates (see ./whatsapp-future.ts)
 */
export const templateMessages = {
	sms: {
		order_confirmation: (params: Record<string, any>) =>
			`Order #${params.order_number} confirmed! Total: ₦${params.total_amount}. Track: ${params.tracking_url} - BenPharm`,
		
		payment_success: (params: Record<string, any>) =>
			`Payment received for Order #${params.order_number}: ₦${params.amount} via ${params.method}. Thank you! - BenPharm`,
		
		delivery_update: (params: Record<string, any>) =>
			`Order #${params.order_number} is ${params.status_label}. ${params.eta_or_notes} - BenPharm`,
		
		low_stock_alert: (params: Record<string, any>) =>
			`ALERT: ${params.product_name} low stock (${params.current_stock}). ${params.recommended_action} - BenPharm`,
		
		business_verification: (params: Record<string, any>) =>
			`Business verification for ${params.business_name}: ${params.status}. Contact support if needed - BenPharm`
	},
	
	// WhatsApp templates moved to ./whatsapp-future.ts for Phase 2 implementation
	whatsapp: {
		// Placeholder - see ./whatsapp-future.ts for full implementation
		order_confirmation: () => 'WhatsApp notifications coming in Phase 2',
		payment_success: () => 'WhatsApp notifications coming in Phase 2',
		delivery_update: () => 'WhatsApp notifications coming in Phase 2',
		low_stock_alert: () => 'WhatsApp notifications coming in Phase 2'
	}
};

/**
 * Get template message content for a specific channel and type
 * Defaults to SMS templates as primary channel
 */
export function getTemplateMessage(
	channel: 'whatsapp' | 'sms', 
	type: string, 
	params: Record<string, any>
): string {
	const messageGenerator = templateMessages[channel]?.[type as keyof typeof templateMessages[typeof channel]];
	
	if (typeof messageGenerator === 'function') {
		return messageGenerator(params);
	}
	
	// Fallback: simple parameter substitution
	let message = `Notification: ${type}`;
	Object.entries(params).forEach(([key, value]) => {
		message += ` ${key}: ${value}`;
	});
	
	return message;
}
