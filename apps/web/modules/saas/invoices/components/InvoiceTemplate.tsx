import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Register fonts if needed, otherwise use standard fonts
// Font.register({ family: 'Inter', src: '...' });

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
  },
  logo: {
    width: 150,
    height: 50, // Adjust based on your logo aspect ratio
    marginBottom: 10,
  },
  companyDetails: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  subtitle: {
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

interface InvoiceTemplateProps {
  order: any; // Ideally typed with your Order type + includes
  invoiceNumber: string;
  invoiceDate: Date;
}

export const InvoiceTemplate = ({ order, invoiceNumber, invoiceDate }: InvoiceTemplateProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount).replace('NGN', '₦');
  };

  const calculateSubtotal = () => {
    return order.orderItems.reduce((sum: number, item: any) => sum + (Number(item.subtotal) || 0), 0);
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
             {/* Placeholder for Logo - requires absolute path or base64 */}
             <Text style={styles.title}>BENPHARMA</Text>
             <Text style={styles.subtitle}>Modern Pharmacy Solutions</Text>
          </View>
          <View style={styles.companyDetails}>
            <Text style={styles.title}>INVOICE</Text>
            <Text style={styles.value}>#{invoiceNumber}</Text>
          </View>
        </View>

        {/* Info Section */}
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
              <Text style={styles.subtitle}>Date Issued:</Text>
              <Text style={styles.value}>{invoiceDate.toLocaleDateString()}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
               <Text style={styles.subtitle}>Due Date:</Text>
               <Text style={styles.value}>{new Date(invoiceDate.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
               <Text style={styles.subtitle}>Order Ref:</Text>
               <Text style={styles.value}>{order.orderNumber}</Text>
            </View>
          </View>
        </View>

        {/* Table */}
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

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(calculateSubtotal())}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax (0%)</Text>
            <Text style={styles.totalValue}>{formatCurrency(0)}</Text>
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

        {/* Footer */}
        <Text style={styles.footer}>
          Thank you for your business. Payment is due within 7 days.
          Ben-Pharma Ltd | RC 123456 | Lagos, Nigeria
        </Text>
      </Page>
    </Document>
  );
};
