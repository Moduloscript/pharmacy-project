var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 * Base provider class with common functionality
 */
export class BaseNotificationProvider {
    send(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Validate recipient format based on channel
                this.validateRecipient(data.recipient, data.channel);
                // Log attempt (without sensitive data)
                console.log(`📤 Sending ${data.channel} notification via ${this.name}: ${data.type}`);
                // Send the message
                const result = yield this.sendMessage(data);
                // Enhance result with provider metadata
                return Object.assign(Object.assign({}, result), { provider: this.name, channel: this.channel, timestamp: new Date() });
            }
            catch (error) {
                console.error(`❌ ${this.name} provider error:`, error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                    retryable: this.isRetryableError(error),
                    provider: this.name,
                    channel: this.channel,
                    timestamp: new Date(),
                };
            }
        });
    }
    /**
     * Validate recipient format based on channel
     */
    validateRecipient(recipient, channel) {
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
    normalizeNigerianPhone(phone) {
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
    isRetryableError(error) {
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
    testConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            // Override in specific providers
            return true;
        });
    }
}
