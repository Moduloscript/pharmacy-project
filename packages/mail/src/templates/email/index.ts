import { render } from '@react-email/render';
import * as React from 'react';
import { OrderConfirmationEmail } from './OrderConfirmationEmail';
import { PaymentSuccessEmail } from './PaymentSuccessEmail';
import { DeliveryUpdateEmail } from './DeliveryUpdateEmail';
import { GenericNoticeEmail } from './GenericNoticeEmail';

export type EmailTemplateName =
  | 'order_confirmation_email'
  | 'payment_success_email'
  | 'delivery_update_email'
  | 'generic_notice';

export async function renderEmailByTemplate(template: string, params: Record<string, any>): Promise<string | null> {
  try {
    switch (template) {
      case 'order_confirmation_email':
        return await render(React.createElement(OrderConfirmationEmail, params as any));
      case 'payment_success_email':
        return await render(React.createElement(PaymentSuccessEmail, params as any));
      case 'delivery_update_email':
        return await render(React.createElement(DeliveryUpdateEmail, params as any));
      case 'generic_notice':
        return await render(React.createElement(GenericNoticeEmail, params as any));
      default:
        return null;
    }
  } catch (e) {
    console.error('Email template render error:', e);
    return null;
  }
}

export async function renderEmailByType(type: string, params: Record<string, any>): Promise<string | null> {
  const t = (type || '').toLowerCase();
  switch (t) {
    case 'order_confirmation':
      return await renderEmailByTemplate('order_confirmation_email', params);
    case 'payment_success':
      return await renderEmailByTemplate('payment_success_email', params);
    case 'delivery_update':
      return await renderEmailByTemplate('delivery_update_email', params);
    default:
      return await renderEmailByTemplate('generic_notice', {
        title: 'Notification from BenPharm',
        preview: params.preview,
        message: params.message,
        rows: Object.keys(params || {}).map((k) => ({ label: k, value: String(params[k]) })),
      });
  }
}
