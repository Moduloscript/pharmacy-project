var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { config } from '@repo/config';
import { BaseNotificationProvider } from './notifications';
import { renderEmailByTemplate, renderEmailByType } from '../templates/email';
/**
 * Resend Email Provider implementing the Queue NotificationProvider interface
 */
export class ResendEmailProvider extends BaseNotificationProvider {
    constructor() {
        super(...arguments);
        this.name = 'Resend';
        this.channel = 'email';
    }
    sendMessage(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const apiKey = process.env.RESEND_API_KEY;
                if (!apiKey) {
                    return {
                        success: false,
                        error: 'RESEND_API_KEY is not set',
                        retryable: false,
                    };
                }
                // Validate from address and ensure it's a string
                const fromRaw = config.mails.from;
                const from = typeof fromRaw === 'string' && fromRaw.includes('@')
                    ? fromRaw
                    : 'onboarding@resend.dev';
                const to = data.recipient;
                const subject = (data.subject && data.subject.trim().length > 0)
                    ? data.subject
                    : this.deriveSubject(data);
                // Render HTML and coerce to a safe string
                const htmlRendered = yield this.renderHtml(data);
                let html = typeof htmlRendered === 'string' ? htmlRendered : String(htmlRendered !== null && htmlRendered !== void 0 ? htmlRendered : '');
                if (!html || html.trim().length === 0) {
                    html = `<div style="font-family: Arial, sans-serif; line-height: 1.5"><h2>${subject}</h2><p>This is an automated notification from BenPharm.</p></div>`;
                }
                // Provide a very simple text fallback by stripping tags
                const text = data.message
                    ? String(data.message)
                    : html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                const response = yield fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({ from, to, subject, html: String(html), text }),
                });
                let result = null;
                try {
                    result = yield response.json();
                }
                catch (_) {
                    // ignore JSON parse errors
                }
                if (response.ok) {
                    return {
                        success: true,
                        providerMessageId: result === null || result === void 0 ? void 0 : result.id,
                        providerResponse: result,
                    };
                }
                const msg = (typeof (result === null || result === void 0 ? void 0 : result.error) === 'string' && result.error) ||
                    ((_a = result === null || result === void 0 ? void 0 : result.error) === null || _a === void 0 ? void 0 : _a.message) ||
                    (result === null || result === void 0 ? void 0 : result.message) ||
                    `Resend error (${response.status})`;
                return {
                    success: false,
                    error: String(msg),
                    retryable: this.isRetryableError(new Error(String(msg))),
                    providerResponse: result,
                };
            }
            catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    retryable: true,
                };
            }
        });
    }
    deriveSubject(data) {
        var _a, _b, _c;
        const t = data.type;
        const p = data.templateParams || {};
        switch (t) {
            case 'order_confirmation':
                return `Order Confirmation - #${(_a = p.order_number) !== null && _a !== void 0 ? _a : ''}`.trim();
            case 'payment_success':
                return `Payment Confirmation - #${(_b = p.order_number) !== null && _b !== void 0 ? _b : ''}`.trim();
            case 'delivery_update':
                return `Delivery Update - #${(_c = p.order_number) !== null && _c !== void 0 ? _c : ''}`.trim();
            case 'low_stock_alert':
                return 'Stock Alert';
            case 'business_verification':
                return 'Business Verification';
            case 'password_reset':
                return 'Reset your password';
            case 'welcome':
                return 'Welcome to BenPharm';
            default:
                // Prescription and others fall back here
                if (t && t.startsWith('prescription')) {
                    return 'Prescription Update';
                }
                return 'Notification from BenPharm';
        }
    }
    renderHtml(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            // Deep-resolve any Promise values inside template params to avoid "[object Promise]" in output
            const rawParams = (data.templateParams || {});
            const resolveDeep = (val) => __awaiter(this, void 0, void 0, function* () {
                if (!val)
                    return val;
                // Detect promise-like
                if (typeof val === 'object' || typeof val === 'function') {
                    if (typeof val.then === 'function') {
                        try {
                            return yield val;
                        }
                        catch (e) {
                            // If a promise rejects, fall back to string to avoid breaking rendering
                            return String(e);
                        }
                    }
                }
                if (Array.isArray(val)) {
                    return Promise.all(val.map((v) => resolveDeep(v)));
                }
                if (typeof val === 'object') {
                    const out = {};
                    for (const [k, v] of Object.entries(val)) {
                        out[k] = yield resolveDeep(v);
                    }
                    return out;
                }
                return val;
            });
            const p = (yield resolveDeep(rawParams));
            // Try React Email templates first
            try {
                let html = null;
                if (data.template) {
                    html = renderEmailByTemplate(data.template, Object.assign(Object.assign({}, p), { order_number: (_a = p.order_number) !== null && _a !== void 0 ? _a : p.orderNumber, customer_name: (_b = p.customer_name) !== null && _b !== void 0 ? _b : p.customerName, amount: p.amount, method: p.method, transaction_id: (_c = p.transaction_id) !== null && _c !== void 0 ? _c : p.transactionId, status_label: (_d = p.status_label) !== null && _d !== void 0 ? _d : p.statusLabel, tracking_url: (_e = p.tracking_url) !== null && _e !== void 0 ? _e : p.trackingUrl }));
                }
                if (!html) {
                    html = renderEmailByType(data.type, Object.assign(Object.assign({}, p), { order_number: (_f = p.order_number) !== null && _f !== void 0 ? _f : p.orderNumber, customer_name: (_g = p.customer_name) !== null && _g !== void 0 ? _g : p.customerName, amount: p.amount, method: p.method, transaction_id: (_h = p.transaction_id) !== null && _h !== void 0 ? _h : p.transactionId, status_label: (_j = p.status_label) !== null && _j !== void 0 ? _j : p.statusLabel, tracking_url: (_k = p.tracking_url) !== null && _k !== void 0 ? _k : p.trackingUrl }));
                }
                if (html)
                    return html;
            }
            catch (err) {
                console.warn('Email template render failed, using basic HTML fallback:', err);
            }
            // Basic fallback if templates don't render
            const esc = (v) => (v == null ? '' : String(v));
            if (data.message) {
                return `<div style=\"font-family: Arial, sans-serif; line-height: 1.5\"><p>${esc(data.message)}</p></div>`;
            }
            return `<div style=\"font-family: Arial, sans-serif; line-height: 1.5\"><h2>${this.deriveSubject(data)}</h2><p>This is an automated notification from BenPharm.</p></div>`;
        });
    }
}
