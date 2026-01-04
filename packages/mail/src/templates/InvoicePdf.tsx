import { Document, Page, Text, View, StyleSheet, Image, Svg, Path } from '@react-pdf/renderer';
import React from 'react';

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 20,
    alignItems: 'center', // Align items vertically in the header
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10, // Not supported in react-pdf everywhere, using margin instead on text
    width: '60%', // Give plenty of space for the logo
  },
  logoIcon: {
    width: 60,
    height: 60,
  },
  logoText: {
    marginLeft: 15, // Space between icon and text
  },
  logoTitle: {
    fontSize: 32, // Large and prominent
    fontWeight: 'bold',
    color: '#111827', 
    textTransform: 'none', // Keep it sentence case or specific branding
  },
  logoSubtitle: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  companyDetails: {
    alignItems: 'flex-end',
    width: '35%',
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  invoiceSubtitle: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 2,
  },
  invoiceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  section: {
    width: '45%',
  },
  label: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 10,
    color: '#111827',
    marginBottom: 2,
  },
  table: {
    width: '100%',
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 8,
  },
  colDescription: {
    width: '50%',
  },
  colQty: {
    width: '15%',
    textAlign: 'center',
  },
  colPrice: {
    width: '15%',
    textAlign: 'right',
  },
  colTotal: {
    width: '20%',
    textAlign: 'right',
  },
  headerText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#111827',
    textTransform: 'uppercase',
  },
  rowText: {
    fontSize: 10,
    color: '#374151',
  },
  totals: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    marginTop: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
    width: '50%',
  },
  totalLabel: {
    fontSize: 10,
    color: '#6B7280',
    width: '50%',
    textAlign: 'right',
    paddingRight: 10,
  },
  totalValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#111827',
    width: '50%',
    textAlign: 'right',
  },
  grandTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    borderTopWidth: 2,
    borderTopColor: '#111827',
    paddingTop: 8,
    marginTop: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 9,
    color: '#9CA3AF',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 20,
  },
});

export interface InvoicePdfProps {
  order: any;
  invoiceNumber: string;
  invoiceDate: Date;
  logoBuffer?: Buffer;
  logoSrc?: string;
}

const BenPharmaLogo = () => (
  <View style={styles.logoContainer}>
    {/* Vector Logo Icon */}
    <Svg viewBox="0 0 734 635" style={styles.logoIcon}>
      <Path
        opacity="0.2"
        d="M282.102 232.435C328.904 205.42 404.785 205.42 451.588 232.435L697.946 374.634C744.748 401.648 744.748 445.447 697.946 472.462L451.588 614.661C404.785 641.676 328.904 641.676 282.102 614.661L35.7432 472.462C-11.059 445.447 -11.0589 401.648 35.7432 374.634L282.102 232.435Z"
        fill="#2563EB" // Primary Blue (Tailwind blue-600 approx)
      />
      <Path
        opacity="0.4"
        d="M282.102 126.674C328.904 99.66 404.785 99.66 451.588 126.674L697.946 268.874C744.748 295.888 744.748 339.687 697.946 366.702L451.588 508.901C404.785 535.915 328.904 535.915 282.102 508.901L35.7432 366.702C-11.059 339.687 -11.0589 295.888 35.7432 268.874L282.102 126.674Z"
        fill="#2563EB" 
      />
      <Path
        fillRule="evenodd"
        d="M451.588 20.9141C404.785 -6.10027 328.904 -6.1003 282.102 20.9141L35.7432 163.113C-11.0589 190.128 -11.059 233.927 35.7432 260.941L282.102 403.141C328.904 430.155 404.785 430.155 451.588 403.141L697.946 260.941C744.748 233.927 744.748 190.128 697.946 163.113L451.588 20.9141ZM497.704 114.921C499.134 115.855 500.121 117.04 500.545 118.332C505.138 132.238 505.138 143.12 505.072 154.003C505.072 198.349 468.453 225.167 420.48 245.161V290.25C420.485 294.097 418.849 297.868 415.755 301.141C412.662 304.413 408.233 307.058 402.967 308.777L337.739 330.105C335.32 330.893 332.634 331.263 329.935 331.181C327.236 331.1 324.613 330.569 322.316 329.64C320.019 328.71 318.124 327.412 316.809 325.87C315.495 324.327 314.806 322.591 314.806 320.825V275.982L299.957 285.686C297.993 286.969 295.661 287.987 293.095 288.682C290.529 289.377 287.779 289.734 285.001 289.734C282.223 289.734 279.473 289.377 276.907 288.682C274.341 287.987 272.009 286.969 270.045 285.686L236.407 263.7C232.442 261.109 230.214 257.594 230.214 253.93C230.214 250.265 232.442 246.751 236.407 244.159L251.257 234.456H182.678C179.975 234.457 177.316 234.006 174.955 233.147C172.593 232.288 170.607 231.049 169.184 229.547C167.761 228.046 166.949 226.331 166.825 224.567C166.701 222.803 167.269 221.047 168.475 219.466L201.136 176.8C203.771 173.364 207.817 170.475 212.82 168.455C217.823 166.435 223.587 165.364 229.468 165.36H298.331C328.857 133.922 369.765 110.084 437.967 110.084C454.555 110.084 471.202 110.084 492.483 113.064C494.46 113.341 496.273 113.986 497.704 114.921ZM405.86 179.723C410.207 181.621 415.318 182.634 420.546 182.634C427.557 182.634 434.281 180.814 439.239 177.575C444.196 174.335 446.981 169.942 446.981 165.36C446.981 161.944 445.431 158.604 442.526 155.763C439.622 152.923 435.493 150.709 430.663 149.401C425.832 148.094 420.517 147.752 415.389 148.418C410.261 149.085 405.551 150.73 401.854 153.146C398.157 155.562 395.639 158.64 394.619 161.99C393.599 165.341 394.123 168.814 396.124 171.971C398.124 175.127 401.513 177.825 405.86 179.723Z"
        fill="#2563EB" 
      />
    </Svg>
    <View style={styles.logoText}>
      <Text style={styles.logoTitle}>BenPharma</Text>
      <Text style={styles.logoSubtitle}>Modern Pharmacy Solutions</Text>
    </View>
  </View>
);

export const InvoicePdf = ({ order, invoiceNumber, invoiceDate, logoBuffer, logoSrc }: InvoicePdfProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      currencyDisplay: 'code',
    }).format(amount);
  };

  const calculateSubtotal = () => {
    return order.orderItems.reduce((sum: number, item: any) => sum + (Number(item.subtotal) || 0), 0);
  };

  const finalLogoSrc = logoSrc || (logoBuffer ? `data:image/png;base64,${logoBuffer.toString('base64')}` : undefined);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
             {finalLogoSrc ? (
               <Image src={finalLogoSrc} style={{ width: '100%', height: 60, objectFit: 'contain', objectPosition: 'left' }} />
             ) : (
                <BenPharmaLogo /> 
             )}
          </View>
          <View style={styles.companyDetails}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.value}>#{invoiceNumber}</Text>
          </View>
        </View>

        <View style={styles.invoiceInfo}>
          <View style={styles.section}>
            <Text style={styles.label}>Bill To:</Text>
            <Text style={styles.value}>{order.customer?.businessName || order.customer?.user?.name || 'Valued Customer'}</Text>
            <Text style={styles.value}>{order.deliveryAddress}</Text>
            <Text style={styles.value}>{order.deliveryCity}, {order.deliveryState}</Text>
            <Text style={styles.value}>{order.customer?.phone}</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.label}>Invoice Details:</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
              <Text style={styles.invoiceSubtitle}>Date Issued:</Text>
              <Text style={styles.value}>{invoiceDate.toLocaleDateString()}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
               <Text style={styles.invoiceSubtitle}>Due Date:</Text>
               <Text style={styles.value}>{new Date(invoiceDate.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
               <Text style={styles.invoiceSubtitle}>Order Ref:</Text>
               <Text style={styles.value}>{order.orderNumber}</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.colDescription]}>Description</Text>
            <Text style={[styles.headerText, styles.colQty]}>Qty</Text>
            <Text style={[styles.headerText, styles.colPrice]}>Unit Price</Text>
            <Text style={[styles.headerText, styles.colTotal]}>Total</Text>
          </View>
          
          {order.orderItems.map((item: any, i: number) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.rowText, styles.colDescription]}>{item.productName}</Text>
              <Text style={[styles.rowText, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.rowText, styles.colPrice]}>{formatCurrency(Number(item.unitPrice))}</Text>
              <Text style={[styles.rowText, styles.colTotal]}>{formatCurrency(Number(item.subtotal))}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(calculateSubtotal())}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Delivery</Text>
            <Text style={styles.totalValue}>{formatCurrency(Number(order.deliveryFee) || 0)}</Text>
          </View>
          <View style={[styles.totalRow, { marginTop: 8 }]}>
            <Text style={[styles.totalLabel, styles.grandTotal]}>Total Due</Text>
            <Text style={[styles.totalValue, styles.grandTotal]}>{formatCurrency(Number(order.total))}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Thank you for your business. Payment is due within 7 days.
          Ben-Pharma Ltd | RC 123456 | Lagos, Nigeria
        </Text>
      </Page>
    </Document>
  );
};
