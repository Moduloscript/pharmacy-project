
import { db } from '@repo/database';

async function main() {
  console.log('Checking triggers on order table...');
  
  try {
    const triggers = await db.$queryRaw`
      SELECT 
        trigger_name,
        event_manipulation,
        event_object_table,
        action_statement,
        action_timing
      FROM information_schema.triggers
      WHERE event_object_table = 'order'
      OR event_object_table = 'Order';
    `;
    
    console.log('Triggers found:');
    console.dir(triggers, { depth: null });

  } catch (error) {
    console.error('Error querying triggers:', error);
  } finally {
    process.exit(0);
  }
}

main();
