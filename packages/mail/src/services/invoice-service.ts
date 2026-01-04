import { db } from '@repo/database';
import { renderToStream } from '@react-pdf/renderer';
import { InvoicePdf } from '../templates/InvoicePdf';
import { createElement } from 'react';
import fs from 'fs';
import path from 'path';

export class InvoiceService {
  
  /**
   * Generates or retrieves an invoice number for an order.
   * Format: INV-YYYY-SEQ (e.g., INV-2025-000001)
   */
  async getInvoiceNumber(orderId: string): Promise<{ invoiceNumber: string, invoiceDate: Date }> {
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { invoiceNumber: true, invoiceDate: true }
    });

    if (order?.invoiceNumber && order?.invoiceDate) {
      return { invoiceNumber: order.invoiceNumber, invoiceDate: order.invoiceDate };
    }

    // Generate new invoice number
    const date = new Date();
    const year = date.getFullYear();
    const count = await db.order.count({
      where: {
        invoiceNumber: {
          not: null
        }
      }
    });

    const sequence = (count + 1).toString().padStart(6, '0');
    const invoiceNumber = `INV-${year}-${sequence}`;
    
    // Update order
    await db.order.update({
      where: { id: orderId },
      data: {
        invoiceNumber,
        invoiceDate: date
      }
    });

    return { invoiceNumber, invoiceDate: date };
  }

  async generatePdf(orderId: string): Promise<Buffer> {
    const stream = await this.generatePdfStream(orderId);
    return new Promise((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      stream.on('data', (chunk: Uint8Array) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', (err: Error) => reject(err));
    });
  }

  async generatePdfStream(orderId: string) {
    const order = await db.order.findUnique({
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

    // Read logo file
    let logoBuffer: Buffer | undefined;
    try {
      // Trying common paths
      const possiblePaths = [
        path.join(process.cwd(), 'public/images/logo.png'), 
        path.join(process.cwd(), 'apps/web/public/images/logo.png'), 
        path.join(__dirname, '../../../../../../apps/web/public/images/logo.png')
      ];
      
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          logoBuffer = fs.readFileSync(p);
          break;
        }
      }
    } catch (e) {
      console.warn('Failed to load invoice logo', e);
    }
    
    // @ts-ignore
    const stream = await renderToStream(createElement(InvoicePdf, {
      order,
      invoiceNumber,
      invoiceDate,
      logoBuffer
    }));

    return stream;
  }
}

export const invoiceService = new InvoiceService();
