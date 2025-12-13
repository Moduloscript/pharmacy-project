import * as React from 'react';
import { Section, Text, Button, Hr } from '@react-email/components';
import { EmailLayout } from './components/Layout';

export function PrescriptionClarificationEmail(props: {
  customerName?: string;
  orderNumber: string;
  clarificationRequest?: string;
  pharmacistName?: string;
  businessName?: string;
  medicationList?: string;
}) {
  return (
    <EmailLayout
      title={`Action Needed: Update for Order #${props.orderNumber}`}
      preview={`We just need a little more info to get your ${props.medicationList || 'order'} on its way.`}
    >
      <Section>
        <Text style={{ fontSize: 16, color: '#0F172A' }}>
          {props.customerName ? `Hi ${props.customerName},` : 'Hello,'}
        </Text>
        <Text style={{ fontSize: 14, color: '#0F172A', lineHeight: 1.6 }}>
          Thanks for choosing BenPharm! We are currently processing your order for <strong>{props.medicationList || `Order #${props.orderNumber}`}</strong>.
        </Text>
        <Text style={{ fontSize: 14, color: '#0F172A', lineHeight: 1.6 }}>
          To ensure your safety and compliance with pharmacy regulations, our pharmacy team needs a quick clarification before we can finalize your prescription.
        </Text>

        <Hr style={{ borderColor: '#E2E8F0', margin: '16px 0' }} />

        <Text style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#0F172A' }}>
          What we need from you:
        </Text>
        <Text style={{ fontSize: 14, color: '#334155', margin: '8px 0 0', padding: '12px', backgroundColor: '#F8FAFC', borderRadius: 6, border: '1px solid #E2E8F0' }}>
          {props.clarificationRequest || 'Please provide additional details about your prescription.'}
        </Text>

        <Hr style={{ borderColor: '#E2E8F0', margin: '16px 0' }} />

        <Text style={{ fontSize: 14, color: '#0F172A' }}>
          Please reply directly to this email with the information, or use the button below to update your order details.
        </Text>

        <Button
          href="https://pharmacy-project-web.vercel.app/app/orders"
          style={{
            backgroundColor: '#0EA5E9',
            color: '#FFFFFF',
            padding: '12px 16px',
            fontSize: 14,
            fontWeight: 500,
            textDecoration: 'none',
            borderRadius: 6,
            display: 'inline-block',
            marginTop: 16,
          }}
        >
          Update Order Info
        </Button>

        <Text style={{ fontSize: 13, color: '#64748B', marginTop: 24 }}>
          As soon as we receive this update, we'll verify your prescription and get your package on its way!
        </Text>
      </Section>
    </EmailLayout>
  );
}
