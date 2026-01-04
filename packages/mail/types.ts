import type { Locale } from "@repo/i18n";
import type { NotificationPriority } from "@repo/database";

export interface SendEmailParams {
	to: string;
	subject: string;
	text: string;
	html?: string;
	attachments?: Array<{
		filename: string;
		content: Buffer | string;
		contentType?: string;
	}>;
}

export type SendEmailHandler = (params: SendEmailParams) => Promise<void>;

export interface MailProvider {
	send: SendEmailHandler;
}

export type BaseMailProps = {
	locale: Locale;
	translations: any;
};

// Notification types (shared with @repo/queue)
export type NotificationChannel = 'whatsapp' | 'sms' | 'email';
export type NotificationStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';

export type NotificationType = 
	| 'order_confirmation' 
	| 'payment_success'
	| 'payment_confirmation'
	| 'delivery_update' 
	| 'low_stock_alert'
	| 'business_verification'
	| 'password_reset'
	| 'welcome';

export interface NotificationJobData {
	// Notification record ID from database
	notificationId: string;
	
	// Basic notification info
	type: NotificationType;
	channel: NotificationChannel;
	recipient: string;
	
	// Message content
	message?: string;
	subject?: string;
	
	// Template-based notifications
	template?: string;
	templateParams?: Record<string, any>;
	
	// Media attachments (for WhatsApp)
	mediaUrl?: string;
	mediaType?: 'image' | 'document' | 'video';
	
	// Metadata
	customerId?: string;
	orderId?: string;
	priority?: NotificationPriority | 'low' | 'normal' | 'high';
	scheduledFor?: Date;
	
	// Attachments (for Email)
	attachments?: Array<{
		filename: string;
		content: Buffer | string; // Buffer or base64 string
		contentType?: string;
	}>;
}

export interface NotificationJobResult {
	success: boolean;
	providerMessageId?: string;
	providerResponse?: any;
	error?: string;
	retryable?: boolean;
}

export interface NotificationProvider {
	name: string;
	channel: NotificationChannel;
	send(data: NotificationJobData): Promise<NotificationJobResult>;
	sendTemplate?(templateName: string, recipient: string, params: Record<string, any>): Promise<NotificationJobResult>;
}

