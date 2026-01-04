import { db as prisma } from '@repo/database';
import { renderToStream } from '@react-pdf/renderer';
import { InvoiceTemplate } from '../components/InvoiceTemplate';
import { createElement } from 'react';

export class InvoiceService {
  
  /**
   * Generates or retrieves an invoice number for an order.
   * Format: INV-YYYY-SEQ (e.g., INV-2025-000001)
   */
  async getInvoiceNumber(orderId: string): Promise<{ invoiceNumber: string, invoiceDate: Date }> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { invoiceNumber: true, invoiceDate: true }
    });

    if (order?.invoiceNumber && order?.invoiceDate) {
      return { invoiceNumber: order.invoiceNumber, invoiceDate: order.invoiceDate };
    }

    // Generate new invoice number
    // Note: In a high-concurrency environment, this needs locking or a separate sequence table.
    // implementing basic optimistic locking/retries or just relying on database unique constraint for now.
    
    const date = new Date();
    const year = date.getFullYear();
    const count = await prisma.order.count({
      where: {
        invoiceNumber: {
          not: null
        }
      }
    });

    const sequence = (count + 1).toString().padStart(6, '0');
    const invoiceNumber = `INV-${year}-${sequence}`;
    
    // Update order
    await prisma.order.update({
      where: { id: orderId },
      data: {
        invoiceNumber,
        invoiceDate: date
      }
    });

    return { invoiceNumber, invoiceDate: date };
  }

  async generatePdfStream(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          include: {
            user: true
          }
        },
        orderItems: true,
      }
    });

    if (!order) throw new Error('Order not found');

    const { invoiceNumber, invoiceDate } = await this.getInvoiceNumber(orderId);

    // Render PDF
    // We use createElement because we are in a server environment (Node/Next.js API route)
    // where JSX transformation might be handled differently depending on setup, 
    // but typically standard React Element creation works fine.
    
    // @ts-ignore - React PDF types sometimes conflict with React 19 types in beta
    const stream = await renderToStream(createElement(InvoiceTemplate, {
      order,
      invoiceNumber,
      invoiceDate
    }));

    return stream;
  }
}

export const invoiceService = new InvoiceService();
