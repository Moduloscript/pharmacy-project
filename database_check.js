const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env' });

const prisma = new PrismaClient();

async function runDatabaseChecks() {
  console.log('\n=== PRE-TEST DATABASE STATE CHECK ===\n');
  
  try {
    // Task 1: Check Payment Count
    console.log('Task 1: Check Payment Count');
    const paymentCount = await prisma.payment.count();
    console.log(`Payment count: ${paymentCount}\n`);

    // Task 2: Check Order Count
    console.log('Task 2: Check Order Count');
    const orderCount = await prisma.order.count();
    console.log(`Order count: ${orderCount}\n`);

    // Task 3: Check User Count
    console.log('Task 3: Check User Count');
    const userCount = await prisma.user.count();
    console.log(`User count: ${userCount}\n`);

    // Task 4: Check Customer Count
    console.log('Task 4: Check Customer Count');
    const customerCount = await prisma.customer.count();
    console.log(`Customer count: ${customerCount}\n`);

    // Task 5: Show Recent Payments (if any)
    console.log('Task 5: Show Recent Payments (if any)');
    const recentPayments = await prisma.payment.findMany({
      select: {
        id: true,
        method: true,
        status: true,
        amount: true,
        createdAt: true,
        gatewayReference: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    if (recentPayments.length > 0) {
      console.table(recentPayments.map(p => ({
        id: p.id,
        gateway: p.method,
        status: p.status,
        amount: p.amount.toString(),
        created_at: p.createdAt.toISOString(),
        reference: p.gatewayReference || 'null'
      })));
    } else {
      console.log('No payments found\n');
    }

    // Task 6: Show Recent Orders (if any)
    console.log('Task 6: Show Recent Orders (if any)');
    const recentOrders = await prisma.order.findMany({
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
        paymentReference: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    if (recentOrders.length > 0) {
      console.table(recentOrders.map(o => ({
        id: o.id,
        status: o.status,
        total_amount: o.total.toString(),
        created_at: o.createdAt.toISOString(),
        payment_reference: o.paymentReference || 'null'
      })));
    } else {
      console.log('No orders found\n');
    }

  } catch (error) {
    console.error('Database error:', error);
  }
}

// Function for post-test checks
async function runPostTestChecks() {
  console.log('\n=== POST-TEST DATABASE STATE CHECK ===\n');
  
  try {
    // Task 7: Verify Payment Creation
    console.log('Task 7: Verify Payment Creation');
    const latestPayments = await prisma.payment.findMany({
      select: {
        id: true,
        method: true,
        status: true,
        amount: true,
        createdAt: true,
        gatewayReference: true
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    });
    
    console.table(latestPayments.map(p => ({
      id: p.id,
      gateway: p.method,
      status: p.status,
      amount: p.amount.toString(),
      created_at: p.createdAt.toISOString(),
      reference: p.gatewayReference || 'null'
    })));

    // Task 8: Verify Order Creation
    console.log('Task 8: Verify Order Creation');
    const latestOrders = await prisma.order.findMany({
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
        paymentReference: true,
        customerId: true
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    });
    
    console.table(latestOrders.map(o => ({
      id: o.id,
      status: o.status,
      total_amount: o.total.toString(),
      created_at: o.createdAt.toISOString(),
      payment_reference: o.paymentReference || 'null',
      customer_id: o.customerId
    })));

    // Task 9: Check Payment-Order Link
    console.log('Task 9: Check Payment-Order Link');
    const paymentOrderLinks = await prisma.payment.findMany({
      select: {
        id: true,
        gatewayReference: true,
        amount: true,
        status: true,
        order: {
          select: {
            id: true,
            paymentReference: true,
            total: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    });
    
    const linkData = paymentOrderLinks.map(p => ({
      payment_id: p.id,
      payment_ref: p.gatewayReference || 'null',
      payment_amount: p.amount.toString(),
      payment_status: p.status,
      order_id: p.order?.id || 'null',
      order_ref: p.order?.paymentReference || 'null',
      order_amount: p.order?.total?.toString() || 'null',
      order_status: p.order?.status || 'null'
    }));
    
    console.table(linkData);

  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.includes('--post-test')) {
  runPostTestChecks();
} else {
  runDatabaseChecks().then(() => {
    prisma.$disconnect();
  });
}
