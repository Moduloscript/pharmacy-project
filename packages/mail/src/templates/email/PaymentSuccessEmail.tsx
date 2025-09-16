import * as React from 'react';
import { Section, Text, Hr } from '@react-email/components';
import { EmailLayout } from './components/Layout';

export function PaymentSuccessEmail(props: {
  customer_name?: string;
  order_number: string;
  amount: number | string;
  method?: string;
  transaction_id?: string;
}) {
  const fmtAmount = (v: any) =>
    typeof v === 'number' ? `₦${v.toLocaleString()}` : v ? `₦${v}` : '';

  return (
    <EmailLayout
      title={`Payment Confirmation - #${props.order_number}`}
      preview={`We received your payment for order #${props.order_number}.`}
    >
      <Section>
        <Text style={{ fontSize: 16, color: '#0F172A' }}>
          {props.customer_name ? `Dear ${props.customer_name},` : 'Hello,'}
        </Text>
        <Text style={{ fontSize: 14, color: '#0F172A' }}>
          We’ve received your payment for order <strong>#{props.order_number}</strong>.
        </Text>

        <Hr style={{ borderColor: '#E2E8F0', margin: '16px 0' }} />
        <Text style={{ fontSize: 14, margin: 0 }}>
          <strong>Amount:</strong> {fmtAmount(props.amount)}
        </Text>
        {props.method && (
          <Text style={{ fontSize: 14, margin: '6px 0 0' }}>
            <strong>Method:</strong> {props.method}
          </Text>
        )}
        {props.transaction_id && (
          <Text style={{ fontSize: 14, margin: '6px 0 0' }}>
            <strong>Transaction ID:</strong> {props.transaction_id}
          </Text>
        )}

        <Hr style={{ borderColor: '#E2E8F0', margin: '16px 0' }} />
        <Text style={{ fontSize: 13, color: '#64748B' }}>
          Your order is now being processed. We’ll notify you when it’s on the way.
        </Text>
      </Section>
    </EmailLayout>
  );
}
