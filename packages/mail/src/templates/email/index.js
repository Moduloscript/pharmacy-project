import { render } from '@react-email/render';
import * as React from 'react';
import { OrderConfirmationEmail } from './OrderConfirmationEmail';
import { PaymentSuccessEmail } from './PaymentSuccessEmail';
import { DeliveryUpdateEmail } from './DeliveryUpdateEmail';
import { GenericNoticeEmail } from './GenericNoticeEmail';
export function renderEmailByTemplate(template, params) {
    try {
        switch (template) {
            case 'order_confirmation_email':
                return render(React.createElement(OrderConfirmationEmail, params));
            case 'payment_success_email':
                return render(React.createElement(PaymentSuccessEmail, params));
            case 'delivery_update_email':
                return render(React.createElement(DeliveryUpdateEmail, params));
            case 'generic_notice':
                return render(React.createElement(GenericNoticeEmail, params));
            default:
                return null;
        }
    }
    catch (e) {
        console.error('Email template render error:', e);
        return null;
    }
}
export function renderEmailByType(type, params) {
    const t = (type || '').toLowerCase();
    switch (t) {
        case 'order_confirmation':
            return renderEmailByTemplate('order_confirmation_email', params);
        case 'payment_success':
            return renderEmailByTemplate('payment_success_email', params);
        case 'delivery_update':
            return renderEmailByTemplate('delivery_update_email', params);
        default:
            return renderEmailByTemplate('generic_notice', {
                title: 'Notification from BenPharm',
                preview: params.preview,
                message: params.message,
                rows: Object.keys(params || {}).map((k) => ({ label: k, value: String(params[k]) })),
            });
    }
}
