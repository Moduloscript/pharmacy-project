import * as React from 'react';
import { Section, Text, Button, Hr } from '@react-email/components';
import { EmailLayout } from './components/Layout';

export function DeliveryUpdateEmail(props: {
  customer_name?: string;
  order_number: string;
  status_label: string;
  eta_or_notes?: string;
  tracking_url?: string;
  order_items?: Array<{ name: string; quantity: number; price?: number }>;
}) {
  return (
    <EmailLayout
      title={`Delivery Update - #${props.order_number}`}
      preview={`Update on Order #${props.order_number}: ${props.status_label}. ${props.eta_or_notes || ''}`}
    >
      <Section>
        <Text style={{ fontSize: 16, color: '#334155', fontWeight: 600 }}>
          {props.customer_name ? `Dear ${props.customer_name},` : 'Hello Customer,'}
        </Text>
        <Text style={{ fontSize: 16, color: '#334155', lineHeight: '1.6' }}>
          This is an update regarding your order with <strong>BenPharmacy</strong>.
        </Text>
        <Section
          style={{
            padding: '24px',
            backgroundColor: '#F8FAFC',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            margin: '20px 0',
          }}
        >
          <Text style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#64748B' }}>Order Number</Text>
          <Text style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 'bold', color: '#0F172A' }}>#{props.order_number}</Text>
          
          <Text style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#64748B' }}>Current Status</Text>
          <Text style={{ margin: '0', fontSize: '18px', fontWeight: 'bold', color: '#0EA5E9' }}>{props.status_label}</Text>
          
          {props.eta_or_notes && (
            <>
               <Hr style={{ borderColor: '#E2E8F0', margin: '16px 0' }} />
               <Text style={{ margin: '0', fontSize: '14px', color: '#475569' }}>{props.eta_or_notes}</Text>
            </>
          )}
        </Section>

        {props.order_items?.length ? (
          <Section style={{ marginBottom: '24px' }}>
            <Text style={{ fontSize: 14, fontWeight: 700, margin: '0 0 8px 0', color: '#334155' }}>Order Summary</Text>
            {props.order_items.map((it, i) => (
              <Text key={i} style={{ fontSize: 14, margin: '4px 0', color: '#475569' }}>
                • {it.name} <span style={{ color: '#94A3B8' }}>× {it.quantity}</span>
              </Text>
            ))}
          </Section>
        ) : null}

        {props.tracking_url && (
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button
              href={props.tracking_url}
              style={{
                backgroundColor: '#0EA5E9',
                color: '#FFFFFF',
                padding: '12px 24px',
                fontSize: 16,
                fontWeight: 600,
                textDecoration: 'none',
                borderRadius: 6,
                display: 'inline-block',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            >
              Track Your Order
            </Button>
          </Section>
        )}
        
        <Text style={{ fontSize: 14, color: '#475569', lineHeight: '1.6', marginTop: 32 }}>
          Our team handles your order with the utmost care. If you have questions about this update or need assistance with your medication, our pharmacists are here to help.
        </Text>
        
        <Hr style={{ borderColor: '#E2E8F0', margin: '32px 0 24px' }} />
        
        <Text style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center' }}>
          BenPharmacy Customer Service<br />
          Trusted Healthcare Partner
        </Text>
      </Section>
    </EmailLayout>
  );
}
