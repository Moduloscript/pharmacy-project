import type { NotificationJobData, NotificationJobResult, NotificationProvider } from '../../types';

/**
 * Base notification provider interface
 * All notification providers (SMS, WhatsApp, Email) should implement this
 */
export interface INotificationProvider {
	name: string;
	channel: 'whatsapp' | 'sms' | 'email';
	
	/**
	 * Send a notification with raw message content
	 */
	send(data: NotificationJobData): Promise<NotificationJobResult>;
	
	/**
	 * Send a notification using a pre-defined template
	 * Optional method for providers that support templating
	 */
	sendTemplate?(
		templateName: string, 
		recipient: string, 
		params: Record<string, any>
	): Promise<NotificationJobResult>;
	
	/**
	 * Test the provider connection/configuration
	 * Useful for health checks and setup validation
	 */
	testConnection?(): Promise<boolean>;
}

/**
 * Provider result wrapper with additional metadata
 */
export interface ProviderResponse extends NotificationJobResult {
	provider: string;
	channel: string;
	timestamp: Date;
	metadata?: Record<string, any>;
}

/**
 * Template parameter validation
 */
export interface NotificationTemplate {
	name: string;
	channel: 'whatsapp' | 'sms' | 'email';
	requiredParams: string[];
	optionalParams?: string[];
	preview?: string;
}

/**
 * Base provider class with common functionality
 */
export abstract class BaseNotificationProvider implements INotificationProvider {
	abstract name: string;
	abstract channel: 'whatsapp' | 'sms' | 'email';
	
	protected abstract sendMessage(data: NotificationJobData): Promise<NotificationJobResult>;
	
	async send(data: NotificationJobData): Promise<NotificationJobResult> {
		try {
			// Validate recipient format based on channel
			this.validateRecipient(data.recipient, data.channel);
			
			// Log attempt (without sensitive data)
			console.log(`📤 Sending ${data.channel} notification via ${this.name}: ${data.type}`);
			
			// Send the message
			const result = await this.sendMessage(data);
			
			// Enhance result with provider metadata
			return {
				...result,
				provider: this.name,
				channel: this.channel,
				timestamp: new Date(),
			} as ProviderResponse;
			
		} catch (error) {
			console.error(`❌ ${this.name} provider error:`, error);
			
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
				retryable: this.isRetryableError(error),
				provider: this.name,
				channel: this.channel,
				timestamp: new Date(),
			} as ProviderResponse;
		}
	}
	
	/**
	 * Validate recipient format based on channel
	 */
	protected validateRecipient(recipient: string, channel: string): void {
		switch (channel) {
			case 'sms':
			case 'whatsapp':
				// Nigerian phone number validation
				if (!/^(\+234|234|0)?[789]\d{9}$/.test(recipient.replace(/\s/g, ''))) {
					throw new Error(`Invalid Nigerian phone number format: ${recipient}`);
				}
				break;
			case 'email':
				// Basic email validation
				if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
					throw new Error(`Invalid email format: ${recipient}`);
				}
				break;
		}
	}
	
	/**
	 * Normalize Nigerian phone number to international format
	 */
	protected normalizeNigerianPhone(phone: string): string {
		// Remove all non-digits
		const cleaned = phone.replace(/\D/g, '');
		
		// Convert to +234 format
		if (cleaned.startsWith('234')) {
			return `+${cleaned}`;
		}
		if (cleaned.startsWith('0')) {
			return `+234${cleaned.substring(1)}`;
		}
		if (cleaned.length === 10) {
			return `+234${cleaned}`;
		}
		
		throw new Error(`Invalid Nigerian phone number: ${phone}`);
	}
	
	/**
	 * Determine if an error is retryable
	 */
	protected isRetryableError(error: any): boolean {
		if (error instanceof Error) {
			// Network errors are typically retryable
			if (error.message.includes('ENOTFOUND') || 
				error.message.includes('ECONNREFUSED') ||
				error.message.includes('timeout')) {
				return true;
			}
			
			// Rate limiting is retryable
			if (error.message.includes('rate limit') || 
				error.message.includes('too many requests')) {
				return true;
			}
		}
		
		// Invalid recipient format is not retryable
		if (error instanceof Error && error.message.includes('Invalid')) {
			return false;
		}
		
		// Default: assume retryable for transient issues
		return true;
	}
	
	/**
	 * Optional method for health checks
	 */
	async testConnection(): Promise<boolean> {
		// Override in specific providers
		return true;
	}
}
