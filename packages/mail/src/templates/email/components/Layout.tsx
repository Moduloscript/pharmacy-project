import * as React from 'react';
import { Html, Head, Preview, Body, Container, Section, Text, Hr } from '@react-email/components';

export function EmailLayout({
  title,
  preview,
  children,
}: {
  title: string;
  preview?: string;
  children: React.ReactNode;
}) {
  const brandColor = '#0EA5E9';
  const textColor = '#0F172A';
  const muted = '#64748B';

  return (
    <Html>
      <Head>
        <title>{title}</title>
      </Head>
      {preview ? <Preview>{preview}</Preview> : null}
      <Body style={{ backgroundColor: '#F8FAFC', margin: 0, padding: '24px 0', fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ width: '100%', maxWidth: 600, margin: '0 auto', background: '#FFFFFF', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
          <Section style={{ background: '#FFFFFF', borderBottom: `3px solid ${brandColor}`, padding: 24 }}>
            <Text style={{ margin: 0, fontSize: 20, fontWeight: 700, color: brandColor }}>BenPharm</Text>
            <Text style={{ margin: '4px 0 0', fontSize: 12, color: muted }}>Trusted online pharmacy in Nigeria</Text>
          </Section>

          <Section style={{ padding: 24 }}>
            {children}
          </Section>

          <Hr style={{ borderColor: '#E2E8F0' }} />
          <Section style={{ padding: '0 24px 24px' }}>
            <Text style={{ color: muted, fontSize: 12, lineHeight: '18px', margin: 0 }}>
              This email was sent by BenPharm. If you have any questions, reply to this email or visit our Help Center.
            </Text>
            <Text style={{ color: muted, fontSize: 12, margin: '8px 0 0' }}>
              © {new Date().getFullYear()} BenPharm. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
