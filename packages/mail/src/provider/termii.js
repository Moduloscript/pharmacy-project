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
 * Termii SMS Provider for Nigerian market
 * Supports DND bypass for transactional messages and all major Nigerian carriers
 */
export class TermiiProvider extends BaseNotificationProvider {
    constructor(config) {
        super();
        this.name = 'Termii';
        this.channel = 'sms';
        this.apiUrl = 'https://api.ng.termii.com/api';
        this.channel_type = 'generic'; // Generic channel works with current setup
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
    sendMessage(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Normalize phone number to Nigerian format
                const normalizedPhone = this.normalizeNigerianPhone(data.recipient);
                // Generate message content
                let message;
                if (data.template && data.templateParams) {
                    // Use template system
                    message = getTemplateMessage('sms', data.type, data.templateParams);
                }
                else if (data.message) {
                    // Use provided message
                    message = data.message;
                }
                else {
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
                const response = yield fetch(`${this.apiUrl}/sms/send`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                });
                const result = yield response.json();
                // Handle response
                if (response.ok && result.message_id) {
                    return {
                        success: true,
                        providerMessageId: result.message_id,
                        providerResponse: result,
                    };
                }
                else {
                    // Handle specific error cases
                    const errorMessage = this.parseTermiiError(result);
                    return {
                        success: false,
                        error: errorMessage,
                        retryable: this.isTermiiErrorRetryable(result),
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
     * Test Termii API connection and credentials
     */
    testConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const apiKeyPreview = `${(_a = this.apiKey) === null || _a === void 0 ? void 0 : _a.substring(0, 5)}...${(_b = this.apiKey) === null || _b === void 0 ? void 0 : _b.substring(this.apiKey.length - 5)}`;
                console.log(`Testing Termii connection with API Key: ${apiKeyPreview} (length: ${(_c = this.apiKey) === null || _c === void 0 ? void 0 : _c.length})`);
                const testUrl = `${this.apiUrl}/get-balance?api_key=${this.apiKey}`;
                console.log(`Request URL: ${this.apiUrl}/get-balance?api_key=${apiKeyPreview}`);
                // Use https module instead of fetch for better compatibility
                const https = yield import('https');
                return new Promise((resolve) => {
                    https.get(testUrl, (res) => {
                        let data = '';
                        res.on('data', (chunk) => {
                            data += chunk;
                        });
                        res.on('end', () => {
                            console.log(`Termii API Response: Status ${res.statusCode}`);
                            console.log(`Response Body Length: ${data.length}`);
                            console.log(`Response Body: ${data.substring(0, 200)}`);
                            if (res.statusCode === 200 && data.trim()) {
                                try {
                                    const result = JSON.parse(data);
                                    console.log(`✅ Termii connection successful. Balance: ${result.balance} ${result.currency}`);
                                    resolve(true);
                                }
                                catch (e) {
                                    console.error('❌ Termii connection failed: Invalid JSON response', data);
                                    resolve(false);
                                }
                            }
                            else {
                                console.error('❌ Termii connection failed:', data || 'Empty response');
                                resolve(false);
                            }
                        });
                    }).on('error', (error) => {
                        console.error('❌ Termii connection test error:', error);
                        resolve(false);
                    });
                });
            }
            catch (error) {
                console.error('❌ Termii connection test error:', error);
                return false;
            }
        });
    }
    /**
     * Get account balance and info
     */
    getAccountInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch(`${this.apiUrl}/get-balance?api_key=${this.apiKey}`, {
                    method: 'GET',
                });
                if (response.ok) {
                    return yield response.json();
                }
                else {
                    throw new Error(`Failed to get account info: ${response.statusText}`);
                }
            }
            catch (error) {
                console.error('Error fetching Termii account info:', error);
                return null;
            }
        });
    }
    /**
     * Send OTP via Termii (useful for verification flows)
     */
    sendOTP(phoneNumber_1, message_1) {
        return __awaiter(this, arguments, void 0, function* (phoneNumber, message, pinLength = 6) {
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
                const response = yield fetch(`${this.apiUrl}/sms/otp/send`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                });
                return yield response.json();
            }
            catch (error) {
                console.error('Error sending OTP:', error);
                throw error;
            }
        });
    }
    /**
     * Parse Termii error response into user-friendly message
     */
    parseTermiiError(result) {
        if (result.message) {
            return result.message;
        }
        // Handle common error codes
        const errorCodes = {
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
    isTermiiErrorRetryable(result) {
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
    static fromEnvironment() {
        const apiKey = process.env.TERMII_API_KEY || process.env.SMS_API_KEY;
        const senderId = process.env.TERMII_SENDER_ID || process.env.SMS_SENDER_ID || 'BenPharm';
        if (!apiKey) {
            throw new Error('TERMII_API_KEY or SMS_API_KEY environment variable is required');
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
export function createTermiiProvider(config) {
    if (config === null || config === void 0 ? void 0 : config.apiKey) {
        return new TermiiProvider({ apiKey: config.apiKey, senderId: config.senderId });
    }
    return TermiiProvider.fromEnvironment();
}
