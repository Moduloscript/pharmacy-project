
import { db } from '@repo/database';

async function main() {
  console.log('Checking database connection and tables...');
  
  try {
    // List all tables in the public schema
    const tables = await db.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    console.log('Tables found in database:');
    console.table(tables);

    // Check specifically for order_item
    const orderItem = await db.$queryRaw`
      SELECT * 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'order_item';
    `;
    
    console.log('order_item table check:', orderItem);

  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    process.exit(0);
  }
}

main();
