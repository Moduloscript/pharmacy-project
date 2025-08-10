/**
 * Nigerian Payment Utility Functions
 * Handles validation, formatting, and utilities specific to Nigerian payments
 */

// Nigerian phone number validation regex
const NIGERIAN_PHONE_REGEX = /^(\+234|0)[789][01]\d{8}$/;

// NAFDAC registration number regex
const NAFDAC_REGEX = /^[A-Z0-9]{2}-\d{4,6}$/;

// Nigerian banks and their USSD codes
const NIGERIAN_BANKS = {
  'GTBank': '*737*',
  'First Bank': '*894*',
  'Zenith Bank': '*966*',
  'UBA': '*919*',
  'Access Bank': '*901*',
  'Sterling Bank': '*822*',
  'Union Bank': '*826*',
  'Fidelity Bank': '*770*',
  'Polaris Bank': '*833*',
  'Wema Bank': '*945*',
  'FCMB': '*329*',
  'Keystone Bank': '*7111*',
} as const;

// Nigerian states and zones
const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'Federal Capital Territory', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano',
  'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun',
  'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
] as const;

/**
 * Validates Nigerian phone number format
 */
export function validateNigerianPhone(phone: string): boolean {
  return NIGERIAN_PHONE_REGEX.test(phone);
}

/**
 * Normalizes Nigerian phone number to international format
 */
export function normalizeNigerianPhone(phone: string): string {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');
  
  // If starts with 0, replace with +234
  if (cleaned.startsWith('0')) {
    return `+234${cleaned.slice(1)}`;
  }
  
  // If starts with 234, add +
  if (cleaned.startsWith('234')) {
    return `+${cleaned}`;
  }
  
  // If already has +234, return as is
  if (phone.startsWith('+234')) {
    return phone;
  }
  
  // Default: assume it's a local number and add +234
  return `+234${cleaned}`;
}

/**
 * Formats amount in Nigerian Naira
 */
export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

/**
 * Validates NAFDAC registration number
 */
export function validateNafdacNumber(nafdacNumber: string): boolean {
  return NAFDAC_REGEX.test(nafdacNumber);
}

/**
 * Validates Nigerian state
 */
export function validateNigerianState(state: string): boolean {
  return NIGERIAN_STATES.includes(state as any);
}

/**
 * Gets Nigerian bank USSD code
 */
export function getBankUSSDCode(bankName: string): string | undefined {
  return NIGERIAN_BANKS[bankName as keyof typeof NIGERIAN_BANKS];
}

/**
 * Validates payment amount (must be positive and reasonable)
 */
export function validatePaymentAmount(amount: number): boolean {
  return amount > 0 && amount <= 10_000_000; // Max 10M Naira per transaction
}

/**
 * Generates Nigerian payment reference
 */
export function generateNigerianPaymentReference(prefix = 'BP'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Validates Nigerian email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Nigerian-specific error messages for better UX
 */
export const NIGERIAN_ERROR_MESSAGES = {
  NETWORK_ERROR: "Network connection issue. Please check your internet and try again.",
  BANK_DECLINE: "Your bank declined this transaction. Please contact your bank or try a different card.",
  INSUFFICIENT_FUNDS: "Insufficient funds. Please fund your account and try again.",
  GATEWAY_DOWN: "Payment service is temporarily unavailable. We're trying another payment method for you.",
  INVALID_PHONE: "Please enter a valid Nigerian phone number (e.g., +2348012345678)",
  INVALID_AMOUNT: "Please enter a valid amount between ₦1 and ₦10,000,000",
  CARD_EXPIRED: "Your card has expired. Please use a different card or update your card details.",
  FRAUD_DETECTED: "This transaction was flagged for security reasons. Please contact support.",
  TIMEOUT: "Payment is taking longer than expected. Please check your payment status.",
  WEBHOOK_ERROR: "Payment confirmation is pending. You will receive a notification shortly."
} as const;

/**
 * Gets user-friendly error message for Nigerian users
 */
export function getNigerianErrorMessage(errorCode: string): string {
  return NIGERIAN_ERROR_MESSAGES[errorCode as keyof typeof NIGERIAN_ERROR_MESSAGES] || 
         "Something went wrong. Please try again or contact support.";
}

/**
 * Checks if network conditions might affect payment
 */
export function detectSlowConnection(): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const timeout = setTimeout(() => resolve(true), 5000); // 5s timeout indicates slow connection
    
    fetch('/api/health', { method: 'HEAD' })
      .then(() => {
        clearTimeout(timeout);
        const duration = Date.now() - startTime;
        resolve(duration > 2000); // >2s considered slow
      })
      .catch(() => {
        clearTimeout(timeout);
        resolve(true); // Connection issues
      });
  });
}

/**
 * Converts kobo to naira (Nigerian payment gateways often use kobo)
 */
export function koboToNaira(kobo: number): number {
  return kobo / 100;
}

/**
 * Converts naira to kobo
 */
export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

/**
 * Validates Nigerian address components
 */
export interface NigerianAddress {
  address: string;
  city: string;
  state: string;
  lga?: string;
  country: 'Nigeria';
}

export function validateNigerianAddress(address: NigerianAddress): boolean {
  return !!(
    address.address &&
    address.city &&
    validateNigerianState(address.state) &&
    address.country === 'Nigeria'
  );
}

/**
 * Transaction fee calculation for Nigerian gateways
 */
export const NIGERIAN_GATEWAY_FEES = {
  FLUTTERWAVE: {
    percentage: 1.4,
    fixed: 50, // ₦50
  },
  OPAY: {
    percentage: 1.5,
    fixed: 0,
  },
  PAYSTACK: {
    percentage: 1.5,
    fixed: 100, // ₦100
  }
} as const;

/**
 * Calculates gateway fee for a transaction
 */
export function calculateGatewayFee(
  amount: number,
  gateway: keyof typeof NIGERIAN_GATEWAY_FEES
): number {
  const config = NIGERIAN_GATEWAY_FEES[gateway];
  const percentageFee = (amount * config.percentage) / 100;
  return Math.round(percentageFee + config.fixed);
}

/**
 * Gets net amount after deducting gateway fees
 */
export function getNetAmount(
  grossAmount: number,
  gateway: keyof typeof NIGERIAN_GATEWAY_FEES
): number {
  const fee = calculateGatewayFee(grossAmount, gateway);
  return grossAmount - fee;
}

/**
 * Nigerian business hours check (useful for bank transfers)
 */
export function isNigerianBusinessHours(): boolean {
  const now = new Date();
  const nigerianTime = new Date(now.toLocaleString("en-US", {timeZone: "Africa/Lagos"}));
  const hour = nigerianTime.getHours();
  const day = nigerianTime.getDay();
  
  // Monday to Friday, 9 AM to 5 PM Nigerian time
  return day >= 1 && day <= 5 && hour >= 9 && hour < 17;
}

/**
 * Get estimated settlement time based on gateway and current time
 */
export function getEstimatedSettlementTime(gateway: string): string {
  const isBusinessHours = isNigerianBusinessHours();
  
  switch (gateway) {
    case 'FLUTTERWAVE':
      return isBusinessHours ? 'Next business day' : 'Within 2 business days';
    case 'OPAY':
      return 'Instant to 24 hours';
    case 'PAYSTACK':
      return isBusinessHours ? 'Within 2 business days' : 'Within 3 business days';
    default:
      return 'Within 3 business days';
  }
}

export {
  NIGERIAN_BANKS,
  NIGERIAN_STATES
};
