import { BaseNotificationProvider } from './notifications';
import { getTemplateMessage } from '../templates/index';
import type { NotificationJobData, NotificationJobResult } from '@repo/queue';

/**
 * Termii SMS Provider for Nigerian market
 * Supports DND bypass for transactional messages and all major Nigerian carriers
 */
export class TermiiProvider extends BaseNotificationProvider {
	name = 'Termii';
	channel = 'sms' as const;
	
	private readonly apiKey: string;
	private readonly senderId: string;
	private readonly apiUrl = 'https://api.ng.termii.com/api';
	private readonly channel_type: 'dnd' | 'whatsapp' | 'generic' = 'generic'; // Generic channel works with current setup
	
	constructor(config: {
		apiKey: string;
		senderId?: string;
	}) {
		super();
		
		if (!config.apiKey) {
			throw new Error('Termii API key is required');
		}
		
		this.apiKey = config.apiKey;
		this.senderId = config.senderId || 'BenPharm';
		
		// Validate sender ID format
		if (this.senderId.length > 11) {
			throw new Error('Termii sender ID must be 11 characters or less');
		}
	}
	
	/**
	 * Send SMS via Termii API
	 */
	protected async sendMessage(data: NotificationJobData): Promise<NotificationJobResult> {
		try {
			// Normalize phone number to Nigerian format
			const normalizedPhone = this.normalizeNigerianPhone(data.recipient);
			
			// Generate message content
			let message: string;
			if (data.template && data.templateParams) {
				// Use template system
				message = getTemplateMessage('sms', data.type, data.templateParams);
			} else if (data.message) {
				// Use provided message
				message = data.message;
			} else {
				throw new Error('Either template or message content is required');
			}
			
			// Validate message length (Termii limit: 160 chars for single SMS)
			if (message.length > 612) { // 4 SMS parts max (153 * 4 = 612)
				console.warn(`Message length ${message.length} exceeds recommended limit for ${data.recipient}`);
			}
			
			// Prepare API request
			const payload = {
				api_key: this.apiKey,
				to: normalizedPhone.replace('+', ''), // Remove + prefix for Termii
				from: this.senderId,
				sms: message,
				type: 'plain',
				channel: this.channel_type, // DND channel bypasses Do Not Disturb for transactional
			};
			
			// Make API request
			const response = await fetch(`${this.apiUrl}/sms/send`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload),
			});
			
			const result = await response.json();
			
			// Handle response
			if (response.ok && result.message_id) {
				return {
					success: true,
					providerMessageId: result.message_id,
					providerResponse: result,
				};
			} else {
				// Handle specific error cases
				const errorMessage = this.parseTermiiError(result);
				
				return {
					success: false,
					error: errorMessage,
					retryable: this.isTermiiErrorRetryable(result),
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
	 * Test Termii API connection and credentials
	 */
	async testConnection(): Promise<boolean> {
		try {
			// Use Termii balance endpoint to test credentials
			const response = await fetch(`${this.apiUrl}/get-balance?api_key=${this.apiKey}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
			});
			
			if (response.ok) {
				const data = await response.json();
				console.log(`✅ Termii connection successful. Balance: ${data.balance} ${data.currency}`);
				return true;
			} else {
				console.error('❌ Termii connection failed:', await response.text());
				return false;
			}
		} catch (error) {
			console.error('❌ Termii connection test error:', error);
			return false;
		}
	}
	
	/**
	 * Get account balance and info
	 */
	async getAccountInfo() {
		try {
			const response = await fetch(`${this.apiUrl}/get-balance?api_key=${this.apiKey}`, {
				method: 'GET',
			});
			
			if (response.ok) {
				return await response.json();
			} else {
				throw new Error(`Failed to get account info: ${response.statusText}`);
			}
		} catch (error) {
			console.error('Error fetching Termii account info:', error);
			return null;
		}
	}
	
	/**
	 * Send OTP via Termii (useful for verification flows)
	 */
	async sendOTP(phoneNumber: string, message: string, pinLength = 6) {
		try {
			const normalizedPhone = this.normalizeNigerianPhone(phoneNumber);
			
			const payload = {
				api_key: this.apiKey,
				message_type: 'ALPHANUMERIC',
				to: normalizedPhone.replace('+', ''),
				from: this.senderId,
				channel: 'dnd',
				pin_attempts: 3,
				pin_time_to_live: 5, // 5 minutes
				pin_length: pinLength,
				pin_placeholder: '< 1234 >',
				message_text: message,
				pin_type: 'NUMERIC',
			};
			
			const response = await fetch(`${this.apiUrl}/sms/otp/send`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload),
			});
			
			return await response.json();
		} catch (error) {
			console.error('Error sending OTP:', error);
			throw error;
		}
	}
	
	/**
	 * Parse Termii error response into user-friendly message
	 */
	private parseTermiiError(result: any): string {
		if (result.message) {
			return result.message;
		}
		
		// Handle common error codes
		const errorCodes: Record<string, string> = {
			'400': 'Invalid request parameters',
			'401': 'Invalid API key or authentication failed',
			'402': 'Insufficient account balance',
			'403': 'Access denied or sender ID not verified',
			'404': 'Invalid endpoint or resource not found',
			'422': 'Invalid phone number format',
			'429': 'Rate limit exceeded - too many requests',
			'500': 'Termii server error',
		};
		
		if (result.code && errorCodes[result.code]) {
			return errorCodes[result.code];
		}
		
		return result.error || 'SMS delivery failed';
	}
	
	/**
	 * Determine if a Termii error is retryable
	 */
	private isTermiiErrorRetryable(result: any): boolean {
		// Non-retryable errors
		const nonRetryableErrors = [
			'Invalid API key',
			'Invalid phone number',
			'Invalid sender ID',
			'Insufficient balance',
		];
		
		if (result.message) {
			for (const error of nonRetryableErrors) {
				if (result.message.toLowerCase().includes(error.toLowerCase())) {
					return false;
				}
			}
		}
		
		// Rate limiting is retryable
		if (result.code === '429' || (result.message && result.message.includes('rate limit'))) {
			return true;
		}
		
		// Server errors are retryable
		if (result.code === '500' || result.code === '502' || result.code === '503') {
			return true;
		}
		
		// Default: assume retryable for transient issues
		return true;
	}
	
	/**
	 * Create Termii provider instance from environment variables
	 */
	static fromEnvironment(): TermiiProvider {
		const apiKey = process.env.TERMII_API_KEY || process.env.SMS_API_KEY;
		const senderId = process.env.TERMII_SENDER_ID || process.env.SMS_SENDER_ID || 'BenPharm';
		
		if (!apiKey) {
			throw new Error(
				'TERMII_API_KEY or SMS_API_KEY environment variable is required'
			);
		}
		
		return new TermiiProvider({
			apiKey,
			senderId,
		});
	}
}

/**
 * Factory function to create and configure Termii provider
 */
export function createTermiiProvider(config?: {
	apiKey?: string;
	senderId?: string;
}): TermiiProvider {
	if (config?.apiKey) {
		return new TermiiProvider({ apiKey: config.apiKey, senderId: config.senderId });
	}
	
	return TermiiProvider.fromEnvironment();
}
