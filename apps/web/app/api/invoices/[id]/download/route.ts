import { invoiceService } from '@saas/invoices/lib/invoice-service';
import { getSession } from '@saas/auth/lib/server';
import { db as prisma } from '@repo/database';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id: orderId } = await params;

    // Verify ownership
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { customer: { select: { userId: true } } }
    });

    // Check if the order belongs to the user or if user is admin (logic simplified here)
    if (!order || order.customer.userId !== session.user.id) {
       return new NextResponse('Forbidden', { status: 403 });
    }

    const stream = await invoiceService.generatePdfStream(orderId);

    // Convert NodeJS.ReadableStream to Web ReadableStream
    // @react-pdf/renderer returns a NodeJS stream, Next.js App Router expects Web Streams or Buffers
    // Simple way is to convert to Buffer first (not memory efficient for huge files but fine for invoices)
    
    // @ts-ignore
    const chunks: Uint8Array[] = [];
    // @ts-ignore
    for await (const chunk of stream) {
      chunks.push(chunk as Uint8Array);
    }
    const pdfBuffer = Buffer.concat(chunks);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${orderId}.pdf"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    console.error('Invoice download error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
