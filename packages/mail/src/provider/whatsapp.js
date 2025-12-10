var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { BaseNotificationProvider } from './notifications';
import { getTemplateMessage } from '../templates/index';
/**
 * WhatsApp Business API Provider for BenPharm
 * Supports rich messaging, media attachments, and interactive templates
 * Optimized for Nigerian pharmacy use cases
 */
export class WhatsAppProvider extends BaseNotificationProvider {
    constructor(config) {
        super();
        this.name = 'WhatsApp Business';
        this.channel = 'whatsapp';
        this.apiUrl = 'https://graph.facebook.com/v18.0';
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
    sendMessage(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Normalize phone number to WhatsApp format (no + prefix)
                const normalizedPhone = this.normalizeNigerianPhone(data.recipient).replace('+', '');
                let messagePayload;
                if (data.template && data.templateParams) {
                    // Use WhatsApp template message
                    messagePayload = this.buildTemplateMessage(data.template, normalizedPhone, data.templateParams);
                }
                else if (data.message) {
                    // Use text message
                    messagePayload = this.buildTextMessage(normalizedPhone, data.message, data.mediaUrl);
                }
                else {
                    throw new Error('Either template or message content is required');
                }
                // Make API request to WhatsApp Business API
                const response = yield fetch(`${this.apiUrl}/${this.phoneNumberId}/messages`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(messagePayload),
                });
                const result = yield response.json();
                // Handle response
                if (response.ok && result.messages && result.messages[0].id) {
                    return {
                        success: true,
                        providerMessageId: result.messages[0].id,
                        providerResponse: result,
                    };
                }
                else {
                    const errorMessage = this.parseWhatsAppError(result);
                    return {
                        success: false,
                        error: errorMessage,
                        retryable: this.isWhatsAppErrorRetryable(result),
                        providerResponse: result,
                    };
                }
            }
            catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    retryable: true, // Network errors are typically retryable
                };
            }
        });
    }
    /**
     * Build template message payload for WhatsApp
     */
    buildTemplateMessage(templateName, phoneNumber, params) {
        // Map BenPharm templates to WhatsApp template names
        const templateMapping = {
            'order_confirmation_v1': 'benpharm_order_confirmation',
            'payment_success_v1': 'benpharm_payment_success',
            'delivery_update_v1': 'benpharm_delivery_update',
            'low_stock_alert_admin_v1': 'benpharm_stock_alert',
        };
        const whatsappTemplate = templateMapping[templateName];
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
    buildTextMessage(phoneNumber, message, mediaUrl) {
        const payload = {
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
    buildTemplateComponents(templateName, params) {
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
    testConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Test by getting WhatsApp Business Account info
                const response = yield fetch(`${this.apiUrl}/${this.businessAccountId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                    },
                });
                if (response.ok) {
                    const data = yield response.json();
                    console.log(`✅ WhatsApp Business API connection successful. Account: ${data.name}`);
                    return true;
                }
                else {
                    console.error('❌ WhatsApp Business API connection failed:', yield response.text());
                    return false;
                }
            }
            catch (error) {
                console.error('❌ WhatsApp Business API connection test error:', error);
                return false;
            }
        });
    }
    /**
     * Get WhatsApp Business Account information
     */
    getAccountInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch(`${this.apiUrl}/${this.businessAccountId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                    },
                });
                if (response.ok) {
                    return yield response.json();
                }
                else {
                    throw new Error(`Failed to get WhatsApp account info: ${response.statusText}`);
                }
            }
            catch (error) {
                console.error('Error fetching WhatsApp account info:', error);
                return null;
            }
        });
    }
    /**
     * Send media message (images, documents)
     */
    sendMediaMessage(phoneNumber_1, mediaUrl_1, caption_1) {
        return __awaiter(this, arguments, void 0, function* (phoneNumber, mediaUrl, caption, mediaType = 'image') {
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
                const response = yield fetch(`${this.apiUrl}/${this.phoneNumberId}/messages`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                });
                return yield response.json();
            }
            catch (error) {
                console.error('Error sending WhatsApp media:', error);
                throw error;
            }
        });
    }
    /**
     * Parse WhatsApp error response
     */
    parseWhatsAppError(result) {
        var _a, _b, _c;
        if (result.error) {
            if (result.error.message) {
                return result.error.message;
            }
            if ((_a = result.error.error_data) === null || _a === void 0 ? void 0 : _a.details) {
                return result.error.error_data.details;
            }
        }
        // Handle common WhatsApp error codes
        const errorCodes = {
            '131026': 'Message undeliverable - recipient number invalid',
            '131047': 'Re-engagement message - user has not opted in',
            '131056': 'Phone number not registered on WhatsApp',
            '133010': 'Message template does not exist',
            '133016': 'Template parameter count mismatch',
            '135000': 'Generic user error',
        };
        if (((_b = result.error) === null || _b === void 0 ? void 0 : _b.code) && errorCodes[result.error.code]) {
            return errorCodes[result.error.code];
        }
        return ((_c = result.error) === null || _c === void 0 ? void 0 : _c.message) || 'WhatsApp delivery failed';
    }
    /**
     * Determine if WhatsApp error is retryable
     */
    isWhatsAppErrorRetryable(result) {
        var _a, _b;
        // Non-retryable errors
        const nonRetryableErrors = [
            'Invalid phone number',
            'Template does not exist',
            'Parameter count mismatch',
            'User not opted in',
        ];
        if ((_a = result.error) === null || _a === void 0 ? void 0 : _a.message) {
            for (const error of nonRetryableErrors) {
                if (result.error.message.toLowerCase().includes(error.toLowerCase())) {
                    return false;
                }
            }
        }
        // Rate limiting and server errors are retryable
        if ((_b = result.error) === null || _b === void 0 ? void 0 : _b.code) {
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
    static fromEnvironment() {
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
export function createWhatsAppProvider(config) {
    if ((config === null || config === void 0 ? void 0 : config.accessToken) && (config === null || config === void 0 ? void 0 : config.phoneNumberId) && (config === null || config === void 0 ? void 0 : config.businessAccountId)) {
        return new WhatsAppProvider(config);
    }
    return WhatsAppProvider.fromEnvironment();
}
