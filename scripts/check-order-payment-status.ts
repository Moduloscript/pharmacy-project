import { db } from '@repo/database';

async function main() {
  console.log('Checking order payment statuses in database...\n');
  
  try {
    // Get recent orders with their payment status
    const orders = await db.order.findMany({
      select: {
        id: true,
        orderNumber: true,
        paymentStatus: true,
        status: true,
        total: true,
        createdAt: true,
        payments: {
          select: {
            id: true,
            status: true,
            completedAt: true,
            amount: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log('Recent Orders:');
    console.table(orders.map(o => ({
      orderNumber: o.orderNumber,
      orderStatus: o.status,
      paymentStatus: o.paymentStatus,
      total: o.total,
      hasPayment: o.payments.length > 0,
      paymentCompleted: o.payments[0]?.completedAt ? 'Yes' : 'No',
      createdAt: o.createdAt.toISOString().split('T')[0]
    })));

    // Check for mismatches
    const mismatches = orders.filter(o => {
      const hasCompletedPayment = o.payments.some(p => p.status === 'COMPLETED');
      return hasCompletedPayment && o.paymentStatus !== 'COMPLETED';
    });

    if (mismatches.length > 0) {
      console.log(`\n⚠️  Found ${mismatches.length} orders with payment/order status mismatch:`);
      console.table(mismatches.map(o => ({
        orderNumber: o.orderNumber,
        orderPaymentStatus: o.paymentStatus,
        actualPaymentStatus: o.payments[0]?.status
      })));
    } else {
      console.log('\n✅ All orders have matching payment statuses!');
    }

  } catch (error) {
    console.error('Error checking orders:', error);
  } finally {
    process.exit(0);
  }
}

main();
