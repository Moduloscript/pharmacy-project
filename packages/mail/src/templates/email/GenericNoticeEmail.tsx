import * as React from 'react';
import { Section, Text } from '@react-email/components';
import { EmailLayout } from './components/Layout';

export function GenericNoticeEmail(props: {
  title?: string;
  preview?: string;
  message?: string;
  rows?: Array<{ label: string; value: string }>; // optional key info list
}) {
  return (
    <EmailLayout title={props.title || 'Notification from BenPharm'} preview={props.preview}>
      <Section>
        {props.message ? (
          <Text style={{ fontSize: 14, color: '#0F172A' }}>{props.message}</Text>
        ) : null}
        {props.rows?.length ? (
          <>
            {props.rows.map((r, i) => (
              <Text key={i} style={{ fontSize: 14, margin: '6px 0 0' }}>
                <strong>{r.label}:</strong> {r.value}
              </Text>
            ))}
          </>
        ) : null}
      </Section>
    </EmailLayout>
  );
}
