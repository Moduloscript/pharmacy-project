// Nigerian Payment Gateway Types
export interface NigerianCustomer {
	email: string;
	phone: string; // Nigerian format: +234XXXXXXXXXX
	name: string;
	state?: string;
	lga?: string;
}

export interface NigerianOrder {
	id: string;
	orderNumber: string;
	totalAmount: number; // Amount in Naira (NGN)
	currency: 'NGN';
	customer: NigerianCustomer;
	items: Array<{
		name: string;
		quantity: number;
		unitPrice: number;
	}>;
	deliveryAddress?: string;
	deliveryFee?: number;
}

export interface PaymentInitResponse {
	success: boolean;
	paymentUrl?: string;
	reference: string;
	gateway: 'FLUTTERWAVE' | 'OPAY' | 'PAYSTACK';
	error?: string;
	meta?: Record<string, any>;
}

export interface PaymentVerifyResponse {
	success: boolean;
	status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'ABANDONED';
	amount: number;
	currency: string;
	reference: string;
	gatewayReference?: string;
	gatewayFee?: number;
	appFee?: number;
	paymentMethod?: string;
	error?: string;
	gatewayResponse?: Record<string, any>;
}

export interface WebhookResponse {
	success: boolean;
	processed: boolean;
	orderId?: string;
	paymentStatus?: 'SUCCESS' | 'FAILED' | 'PENDING' | 'ABANDONED';
	error?: string;
}

export interface GatewayHealthResponse {
	isHealthy: boolean;
	responseTime: number; // milliseconds
	lastChecked: Date;
	error?: string;
}

// Nigerian Payment Provider Interface
export interface NigerianPaymentProvider {
	/**
	 * Initialize payment with Nigerian payment gateway
	 */
	initializePayment(order: NigerianOrder): Promise<PaymentInitResponse>;

	/**
	 * Verify payment status with gateway
	 */
	verifyPayment(reference: string): Promise<PaymentVerifyResponse>;

	/**
	 * Handle webhook from payment gateway
	 */
	handleWebhook(payload: any, signature?: string): Promise<WebhookResponse>;

	/**
	 * Check gateway health status
	 */
	checkGatewayHealth(): Promise<GatewayHealthResponse>;

	/**
	 * Get supported payment methods for this gateway
	 */
	getSupportedPaymentMethods(): string[];

	/**
	 * Get gateway name
	 */
	getGatewayName(): 'FLUTTERWAVE' | 'OPAY' | 'PAYSTACK';
}

// Payment Orchestrator Types
export interface PaymentOrchestrationResult {
	success: boolean;
	gateway: 'FLUTTERWAVE' | 'OPAY' | 'PAYSTACK';
	attempts: Array<{
		gateway: string;
		success: boolean;
		error?: string;
		timestamp: Date;
	}>;
	finalResult?: PaymentInitResponse;
}

// Error Types
export class NigerianPaymentError extends Error {
	constructor(
		message: string,
		public code: string,
		public gateway?: string,
		public originalError?: any
	) {
		super(message);
		this.name = 'NigerianPaymentError';
	}
}

// Nigerian Payment Error Codes
export const NIGERIAN_PAYMENT_ERRORS = {
	NETWORK_ERROR: 'NETWORK_ERROR',
	GATEWAY_TIMEOUT: 'GATEWAY_TIMEOUT', 
	INVALID_AMOUNT: 'INVALID_AMOUNT',
	INVALID_PHONE: 'INVALID_PHONE',
	INVALID_CURRENCY: 'INVALID_CURRENCY',
	GATEWAY_DOWN: 'GATEWAY_DOWN',
	WEBHOOK_VERIFICATION_FAILED: 'WEBHOOK_VERIFICATION_FAILED',
	INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
	BANK_DECLINE: 'BANK_DECLINE',
	CARD_EXPIRED: 'CARD_EXPIRED',
	FRAUD_DETECTED: 'FRAUD_DETECTED'
} as const;

// Legacy types for backward compatibility
export type CreateCheckoutLink = (params: {
	type: "subscription" | "one-time";
	productId: string;
	email?: string;
	name?: string;
	redirectUrl?: string;
	customerId?: string;
	organizationId?: string;
	userId?: string;
	trialPeriodDays?: number;
	seats?: number;
}) => Promise<string | null>;

export type CreateCustomerPortalLink = (params: {
	subscriptionId?: string;
	customerId: string;
	redirectUrl?: string;
}) => Promise<string | null>;

export type SetSubscriptionSeats = (params: {
	id: string;
	seats: number;
}) => Promise<void>;

export type GetInvoices = (params: { customerId: string }) => Promise<
	{
		id: string;
		date: number;
		status?: string;
		downloadUrl?: string;
	}[]
>;

export type WebhookHandler = (req: Request) => Promise<Response>;

export type PaymentProvider = {
	createCheckoutLink: CreateCheckoutLink;
	createCustomerPortalLink: CreateCustomerPortalLink;
	webhookHandler: WebhookHandler;
};
