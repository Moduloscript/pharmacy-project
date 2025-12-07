import { db } from '@repo/database';

async function main() {
  console.log('Backfilling completedAt for COMPLETED payments...\n');
  
  try {
    // Find all COMPLETED payments without completedAt
    const paymentsToFix = await db.payment.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: null
      },
      select: {
        id: true,
        updatedAt: true,
        createdAt: true
      }
    });

    console.log(`Found ${paymentsToFix.length} payments to backfill\n`);

    if (paymentsToFix.length === 0) {
      console.log('No payments need backfilling!');
      process.exit(0);
    }

    // Update each payment
    // Use updatedAt as completedAt since that's when the webhook updated the status
    let updated = 0;
    for (const payment of paymentsToFix) {
      await db.payment.update({
        where: { id: payment.id },
        data: {
          completedAt: payment.updatedAt || payment.createdAt
        }
      });
      updated++;
      
      if (updated % 10 === 0) {
        console.log(`Progress: ${updated}/${paymentsToFix.length} payments updated`);
      }
    }

    console.log(`\n✅ Successfully backfilled completedAt for ${updated} payments`);

    // Verify the fix
    const remaining = await db.payment.count({
      where: {
        status: 'COMPLETED',
        completedAt: null
      }
    });

    console.log(`\nRemaining payments without completedAt: ${remaining}`);

  } catch (error) {
    console.error('Error backfilling payments:', error);
  } finally {
    process.exit(0);
  }
}

main();
