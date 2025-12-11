import { BaseNotificationProvider } from './notifications';
import { getTemplateMessage } from '../templates/index';
import type { NotificationJobData, NotificationJobResult } from '../../types';

/**
 * WhatsApp Business API Provider for BenPharm
 * Supports rich messaging, media attachments, and interactive templates
 * Optimized for Nigerian pharmacy use cases
 */
export class WhatsAppProvider extends BaseNotificationProvider {
	name = 'WhatsApp Business';
	channel = 'whatsapp' as const;
	
	private readonly accessToken: string;
	private readonly phoneNumberId: string;
	private readonly businessAccountId: string;
	private readonly apiUrl = 'https://graph.facebook.com/v18.0';
	
	constructor(config: {
		accessToken: string;
		phoneNumberId: string;
		businessAccountId: string;
	}) {
		super();
		
		if (!config.accessToken) {
			throw new Error('WhatsApp access token is required');
		}
		
		if (!config.phoneNumberId) {
			throw new Error('WhatsApp phone number ID is required');
		}
		
		this.accessToken = config.accessToken;
		this.phoneNumberId = config.phoneNumberId;
		this.businessAccountId = config.businessAccountId;
	}
	
	/**
	 * Send WhatsApp message via Graph API
	 */
	protected async sendMessage(data: NotificationJobData): Promise<NotificationJobResult> {
		try {
			// Normalize phone number to WhatsApp format (no + prefix)
			const normalizedPhone = this.normalizeNigerianPhone(data.recipient).replace('+', '');
			
			let messagePayload: any;
			
			if (data.template && data.templateParams) {
				// Use WhatsApp template message
				messagePayload = this.buildTemplateMessage(data.template, normalizedPhone, data.templateParams);
			} else if (data.message) {
				// Use text message
				messagePayload = this.buildTextMessage(normalizedPhone, data.message, data.mediaUrl);
			} else {
				throw new Error('Either template or message content is required');
			}
			
			// Make API request to WhatsApp Business API
			const response = await fetch(`${this.apiUrl}/${this.phoneNumberId}/messages`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.accessToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(messagePayload),
			});
			
			const result = await response.json();
			
			// Handle response
			if (response.ok && result.messages && result.messages[0].id) {
				return {
					success: true,
					providerMessageId: result.messages[0].id,
					providerResponse: result,
				};
			} else {
				const errorMessage = this.parseWhatsAppError(result);
				
				return {
					success: false,
					error: errorMessage,
					retryable: this.isWhatsAppErrorRetryable(result),
					providerResponse: result,
				};
			}
			
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				retryable: true, // Network errors are typically retryable
			};
		}
	}
	
	/**
	 * Build template message payload for WhatsApp
	 */
	private buildTemplateMessage(templateName: string, phoneNumber: string, params: Record<string, any>): any {
		// Map BenPharm templates to WhatsApp template names
		const templateMapping = {
			'order_confirmation_v1': 'benpharm_order_confirmation',
			'payment_success_v1': 'benpharm_payment_success',
			'delivery_update_v1': 'benpharm_delivery_update',
			'low_stock_alert_admin_v1': 'benpharm_stock_alert',
		};
		
		const whatsappTemplate = templateMapping[templateName as keyof typeof templateMapping];
		
		if (!whatsappTemplate) {
			// Fallback to text message using template system
			const message = getTemplateMessage('whatsapp', templateName.replace('_v1', ''), params);
			return this.buildTextMessage(phoneNumber, message);
		}
		
		// Build WhatsApp template message
		return {
			messaging_product: 'whatsapp',
			to: phoneNumber,
			type: 'template',
			template: {
				name: whatsappTemplate,
				language: {
					code: 'en' // English for Nigerian market
				},
				components: this.buildTemplateComponents(templateName, params)
			}
		};
	}
	
	/**
	 * Build text message payload for WhatsApp
	 */
	private buildTextMessage(phoneNumber: string, message: string, mediaUrl?: string): any {
		const payload: any = {
			messaging_product: 'whatsapp',
			to: phoneNumber,
			type: 'text',
			text: {
				body: message
			}
		};
		
		// Add media if provided
		if (mediaUrl) {
			payload.type = 'image';
			payload.image = {
				link: mediaUrl,
				caption: message
			};
			delete payload.text;
		}
		
		return payload;
	}
	
	/**
	 * Build template components based on BenPharm use cases
	 */
	private buildTemplateComponents(templateName: string, params: Record<string, any>): any[] {
		switch (templateName) {
			case 'order_confirmation_v1':
				return [
					{
						type: 'header',
						parameters: [
							{
								type: 'text',
								text: params.customer_name
							}
						]
					},
					{
						type: 'body',
						parameters: [
							{
								type: 'text',
								text: params.order_number
							},
							{
								type: 'currency',
								currency: {
									fallback_value: `₦${params.total_amount}`,
									code: 'NGN',
									amount_1000: params.total_amount * 10 // WhatsApp uses amount in lowest denomination
								}
							},
							{
								type: 'text',
								text: params.delivery_address
							}
						]
					},
					{
						type: 'button',
						sub_type: 'url',
						index: '0',
						parameters: [
							{
								type: 'text',
								text: params.tracking_url.split('/').pop() // Extract order ID for URL
							}
						]
					}
				];
				
			case 'payment_success_v1':
				return [
					{
						type: 'body',
						parameters: [
							{
								type: 'text',
								text: params.order_number
							},
							{
								type: 'currency',
								currency: {
									fallback_value: `₦${params.amount}`,
									code: 'NGN',
									amount_1000: params.amount * 10
								}
							},
							{
								type: 'text',
								text: params.method
							}
						]
					}
				];
				
			case 'delivery_update_v1':
				return [
					{
						type: 'body',
						parameters: [
							{
								type: 'text',
								text: params.order_number
							},
							{
								type: 'text',
								text: params.status_label
							},
							{
								type: 'text',
								text: params.eta_or_notes
							}
						]
					}
				];
				
			default:
				return [];
		}
	}
	
	/**
	 * Test WhatsApp Business API connection
	 */
	async testConnection(): Promise<boolean> {
		try {
			// Test by getting WhatsApp Business Account info
			const response = await fetch(`${this.apiUrl}/${this.businessAccountId}`, {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${this.accessToken}`,
				},
			});
			
			if (response.ok) {
				const data = await response.json();
				console.log(`✅ WhatsApp Business API connection successful. Account: ${data.name}`);
				return true;
			} else {
				console.error('❌ WhatsApp Business API connection failed:', await response.text());
				return false;
			}
		} catch (error) {
			console.error('❌ WhatsApp Business API connection test error:', error);
			return false;
		}
	}
	
	/**
	 * Get WhatsApp Business Account information
	 */
	async getAccountInfo() {
		try {
			const response = await fetch(`${this.apiUrl}/${this.businessAccountId}`, {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${this.accessToken}`,
				},
			});
			
			if (response.ok) {
				return await response.json();
			} else {
				throw new Error(`Failed to get WhatsApp account info: ${response.statusText}`);
			}
		} catch (error) {
			console.error('Error fetching WhatsApp account info:', error);
			return null;
		}
	}
	
	/**
	 * Send media message (images, documents)
	 */
	async sendMediaMessage(phoneNumber: string, mediaUrl: string, caption: string, mediaType: 'image' | 'document' | 'video' = 'image') {
		try {
			const normalizedPhone = this.normalizeNigerianPhone(phoneNumber).replace('+', '');
			
			const payload = {
				messaging_product: 'whatsapp',
				to: normalizedPhone,
				type: mediaType,
				[mediaType]: {
					link: mediaUrl,
					caption: caption
				}
			};
			
			const response = await fetch(`${this.apiUrl}/${this.phoneNumberId}/messages`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.accessToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload),
			});
			
			return await response.json();
		} catch (error) {
			console.error('Error sending WhatsApp media:', error);
			throw error;
		}
	}
	
	/**
	 * Parse WhatsApp error response
	 */
	private parseWhatsAppError(result: any): string {
		if (result.error) {
			if (result.error.message) {
				return result.error.message;
			}
			if (result.error.error_data?.details) {
				return result.error.error_data.details;
			}
		}
		
		// Handle common WhatsApp error codes
		const errorCodes: Record<string, string> = {
			'131026': 'Message undeliverable - recipient number invalid',
			'131047': 'Re-engagement message - user has not opted in',
			'131056': 'Phone number not registered on WhatsApp',
			'133010': 'Message template does not exist',
			'133016': 'Template parameter count mismatch',
			'135000': 'Generic user error',
		};
		
		if (result.error?.code && errorCodes[result.error.code]) {
			return errorCodes[result.error.code];
		}
		
		return result.error?.message || 'WhatsApp delivery failed';
	}
	
	/**
	 * Determine if WhatsApp error is retryable
	 */
	private isWhatsAppErrorRetryable(result: any): boolean {
		// Non-retryable errors
		const nonRetryableErrors = [
			'Invalid phone number',
			'Template does not exist',
			'Parameter count mismatch',
			'User not opted in',
		];
		
		if (result.error?.message) {
			for (const error of nonRetryableErrors) {
				if (result.error.message.toLowerCase().includes(error.toLowerCase())) {
					return false;
				}
			}
		}
		
		// Rate limiting and server errors are retryable
		if (result.error?.code) {
			const retryableCodes = ['4', '131031', '131042']; // Rate limit and temporary failures
			if (retryableCodes.some(code => result.error.code.toString().startsWith(code))) {
				return true;
			}
		}
		
		// Default: assume retryable for transient issues
		return true;
	}
	
	/**
	 * Create WhatsApp provider instance from environment variables
	 */
	static fromEnvironment(): WhatsAppProvider {
		const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_API_TOKEN;
		const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
		const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
		
		if (!accessToken) {
			throw new Error('WHATSAPP_ACCESS_TOKEN or WHATSAPP_API_TOKEN environment variable is required');
		}
		
		if (!phoneNumberId) {
			throw new Error('WHATSAPP_PHONE_NUMBER_ID environment variable is required');
		}
		
		if (!businessAccountId) {
			throw new Error('WHATSAPP_BUSINESS_ACCOUNT_ID environment variable is required');
		}
		
		return new WhatsAppProvider({
			accessToken,
			phoneNumberId,
			businessAccountId,
		});
	}
}

/**
 * Factory function to create and configure WhatsApp provider
 */
export function createWhatsAppProvider(config?: {
	accessToken?: string;
	phoneNumberId?: string;
	businessAccountId?: string;
}): WhatsAppProvider {
	if (config?.accessToken && config?.phoneNumberId && config?.businessAccountId) {
		return new WhatsAppProvider(config);
	}
	
	return WhatsAppProvider.fromEnvironment();
}
