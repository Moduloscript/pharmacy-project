import { db } from '@repo/database';

async function main() {
  console.log('Analyzing payment records...\n');
  
  try {
    // Check how many payments have COMPLETED status but null completedAt
    const result = await db.$queryRaw`
      SELECT 
        COUNT(*) as total_completed,
        COUNT(CASE WHEN "completedAt" IS NULL THEN 1 END) as missing_completed_at,
        COUNT(CASE WHEN "completedAt" IS NOT NULL THEN 1 END) as has_completed_at
      FROM payment
      WHERE status = 'COMPLETED';
    `;
    
    console.log('Payment Status Analysis:');
    console.table(result);

    // Show recent completed payments without completedAt
    const recentPayments = await db.payment.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: null
      },
      select: {
        id: true,
        orderId: true,
        amount: true,
        method: true,
        gatewayReference: true,
        createdAt: true,
        updatedAt: true,
        completedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    console.log('\nRecent COMPLETED payments missing completedAt:');
    console.table(recentPayments);

  } catch (error) {
    console.error('Error analyzing payments:', error);
  } finally {
    process.exit(0);
  }
}

main();
