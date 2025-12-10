import * as React from 'react';
import { Section, Text, Button, Hr } from '@react-email/components';
import { EmailLayout } from './components/Layout';
export function DeliveryUpdateEmail(props) {
    return (<EmailLayout title={`Delivery Update - #${props.order_number}`} preview={`Order #${props.order_number} ${props.status_label}. ${props.eta_or_notes || ''}`}>
      <Section>
        <Text style={{ fontSize: 16, color: '#0F172A' }}>
          {props.customer_name ? `Dear ${props.customer_name},` : 'Hello,'}
        </Text>
        <Text style={{ fontSize: 14, color: '#0F172A' }}>
          Your order <strong>#{props.order_number}</strong> is <strong>{props.status_label}</strong>.
        </Text>
        {props.eta_or_notes && (<Text style={{ fontSize: 14, color: '#0F172A', marginTop: 6 }}>{props.eta_or_notes}</Text>)}

        {props.tracking_url && (<>
            <Hr style={{ borderColor: '#E2E8F0', margin: '16px 0' }}/>
            <Button href={props.tracking_url} style={{
                backgroundColor: '#0EA5E9',
                color: '#FFFFFF',
                padding: '12px 16px',
                fontSize: 14,
                textDecoration: 'none',
                borderRadius: 6,
                display: 'inline-block',
            }}>
              Track your order
            </Button>
          </>)}
      </Section>
    </EmailLayout>);
}
