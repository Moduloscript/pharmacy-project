export type NotificationChannel = 'whatsapp' | 'sms' | 'email';
export type NotificationStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';

export type NotificationType = 
	| 'order_confirmation' 
	| 'payment_success' 
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
	priority?: 'low' | 'normal' | 'high';
	scheduledFor?: Date;
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

export interface QueueOptions {
	concurrency?: number;
	maxAttempts?: number;
	backoffDelay?: number;
	removeOnComplete?: number;
	removeOnFail?: number;
}
