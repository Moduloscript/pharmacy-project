import * as React from 'react';
import { Section, Text, Button, Hr } from '@react-email/components';
import { EmailLayout } from './components/Layout';

export function OrderConfirmationEmail(props: {
  customer_name?: string;
  order_number: string;
  total_amount?: number | string;
  delivery_address?: string;
  tracking_url?: string;
  order_items?: Array<{ name: string; quantity: number; price?: number }>;
}) {
  const fmtAmount = (v: any) =>
    typeof v === 'number' ? `₦${v.toLocaleString()}` : v ? `₦${v}` : '';

  return (
    <EmailLayout
      title={`Order Confirmation - #${props.order_number}`}
      preview={`Thanks ${props.customer_name || ''}! Your order #${props.order_number} has been received.`}
    >
      <Section>
        <Text style={{ fontSize: 16, color: '#0F172A' }}>
          {props.customer_name ? `Dear ${props.customer_name},` : 'Hello,'}
        </Text>
        <Text style={{ fontSize: 14, color: '#0F172A' }}>
          Thank you for your order. We’re preparing it now.
        </Text>

        <Hr style={{ borderColor: '#E2E8F0', margin: '16px 0' }} />

        <Text style={{ fontSize: 14, margin: 0 }}>
          <strong>Order #:</strong> {props.order_number}
        </Text>
        {props.total_amount != null && (
          <Text style={{ fontSize: 14, margin: '6px 0 0' }}>
            <strong>Total:</strong> {fmtAmount(props.total_amount)}
          </Text>
        )}
        {props.delivery_address && (
          <Text style={{ fontSize: 14, margin: '6px 0 0' }}>
            <strong>Delivery address:</strong> {props.delivery_address}
          </Text>
        )}

        {props.order_items?.length ? (
          <>
            <Hr style={{ borderColor: '#E2E8F0', margin: '16px 0' }} />
            <Text style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Items</Text>
            {props.order_items.map((it, i) => (
              <Text key={i} style={{ fontSize: 14, margin: '4px 0 0' }}>
                {it.name} × {it.quantity}
                {typeof it.price === 'number' ? ` — ₦${it.price.toLocaleString()}` : ''}
              </Text>
            ))}
          </>
        ) : null}

        {props.tracking_url && (
          <>
            <Hr style={{ borderColor: '#E2E8F0', margin: '16px 0' }} />
            <Button
              href={props.tracking_url}
              style={{
                backgroundColor: '#0EA5E9',
                color: '#FFFFFF',
                padding: '12px 16px',
                fontSize: 14,
                textDecoration: 'none',
                borderRadius: 6,
                display: 'inline-block',
              }}
            >
              Track your order
            </Button>
          </>
        )}

        <Hr style={{ borderColor: '#E2E8F0', margin: '16px 0' }} />
        <Text style={{ fontSize: 13, color: '#64748B' }}>
          We’ll email you updates as your order moves through processing and delivery.
        </Text>
      </Section>
    </EmailLayout>
  );
}
