import { config } from '@repo/config';
import { BaseNotificationProvider } from './notifications';
import type { NotificationJobData, NotificationJobResult } from '../../types';
import { renderEmailByTemplate, renderEmailByType } from '../templates/email';

/**
 * Resend Email Provider implementing the Queue NotificationProvider interface
 */
export class ResendEmailProvider extends BaseNotificationProvider {
  name = 'Resend';
  channel = 'email' as const;

  protected async sendMessage(data: NotificationJobData): Promise<NotificationJobResult> {
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
      const htmlRendered = await this.renderHtml(data);
      let html = typeof htmlRendered === 'string' ? htmlRendered : String(htmlRendered ?? '');
      if (!html || html.trim().length === 0) {
        html = `<div style="font-family: Arial, sans-serif; line-height: 1.5"><h2>${subject}</h2><p>This is an automated notification from BenPharm.</p></div>`;
      }

      // Provide a very simple text fallback by stripping tags
      const text = data.message
        ? String(data.message)
        : html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ from, to, subject, html: String(html), text }),
      });

      let result: any = null;
      try {
        result = await response.json();
      } catch (_) {
        // ignore JSON parse errors
      }

      if (response.ok) {
        return {
          success: true,
          providerMessageId: result?.id,
          providerResponse: result,
        };
      }

      const msg =
        (typeof result?.error === 'string' && result.error) ||
        result?.error?.message ||
        result?.message ||
        `Resend error (${response.status})`;

      return {
        success: false,
        error: String(msg),
        retryable: this.isRetryableError(new Error(String(msg))),
        providerResponse: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      };
    }
  }

  private deriveSubject(data: NotificationJobData): string {
    const t = data.type;
    const p = data.templateParams || {};
    switch (t) {
      case 'order_confirmation':
        return `Order Confirmation - #${p.order_number ?? ''}`.trim();
      case 'payment_success':
        return `Payment Confirmation - #${p.order_number ?? ''}`.trim();
      case 'delivery_update':
        return `Delivery Update - #${p.order_number ?? ''}`.trim();
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
        if (t && typeof t === 'string' && (t as string).startsWith('prescription')) {
          return 'Prescription Update';
        }
        return 'Notification from BenPharm';
    }
  }

  private async renderHtml(data: NotificationJobData): Promise<string> {
    // Deep-resolve any Promise values inside template params to avoid "[object Promise]" in output
    const rawParams = (data.templateParams || {}) as Record<string, any>;

    const resolveDeep = async (val: any): Promise<any> => {
      if (!val) return val;
      // Detect promise-like
      if (typeof val === 'object' || typeof val === 'function') {
        if (typeof (val as any).then === 'function') {
          try {
            return await (val as any);
          } catch (e) {
            // If a promise rejects, fall back to string to avoid breaking rendering
            return String(e);
          }
        }
      }
      if (Array.isArray(val)) {
        return Promise.all(val.map((v) => resolveDeep(v)));
      }
      if (typeof val === 'object') {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(val)) {
          out[k] = await resolveDeep(v);
        }
        return out;
      }
      return val;
    };

    const p = (await resolveDeep(rawParams)) as Record<string, any>;

    // Try React Email templates first
    try {
      let html: string | null = null;

      if (data.template) {
        html = await renderEmailByTemplate(data.template, {
          ...p,
          order_number: p.order_number ?? p.orderNumber,
          customer_name: p.customer_name ?? p.customerName,
          amount: p.amount,
          method: p.method,
          transaction_id: p.transaction_id ?? p.transactionId,
          status_label: p.status_label ?? p.statusLabel,
          tracking_url: p.tracking_url ?? p.trackingUrl,
        });
      }

      if (!html) {
        html = await renderEmailByType(data.type, {
          ...p,
          order_number: p.order_number ?? p.orderNumber,
          customer_name: p.customer_name ?? p.customerName,
          amount: p.amount,
          method: p.method,
          transaction_id: p.transaction_id ?? p.transactionId,
          status_label: p.status_label ?? p.statusLabel,
          tracking_url: p.tracking_url ?? p.trackingUrl,
          order_items: p.order_items ?? p.orderItems, // Add this
          delivery_address: p.delivery_address ?? p.deliveryAddress, // Add this
          total_amount: p.total_amount ?? p.total ?? p.totalAmount, // Add this
        });
      }

      if (html) return html;
    } catch (err) {
      console.warn('Email template render failed, using basic HTML fallback:', err);
    }

    // Basic fallback if templates don't render
    const esc = (v: any) => (v == null ? '' : String(v));
    if (data.message) {
      return `<div style=\"font-family: Arial, sans-serif; line-height: 1.5\"><p>${esc(data.message)}</p></div>`;
    }
    return `<div style=\"font-family: Arial, sans-serif; line-height: 1.5\"><h2>${this.deriveSubject(data)}</h2><p>This is an automated notification from BenPharm.</p></div>`;
  }
}
