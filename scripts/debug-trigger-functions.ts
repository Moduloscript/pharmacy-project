import { db } from '@repo/database';

async function main() {
  console.log('Checking trigger function definitions...\n');
  
  try {
    const functions = await db.$queryRaw`
      SELECT 
        p.proname as function_name,
        pg_get_functiondef(p.oid) as function_definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      AND p.proname IN (
        'enforce_prescription_for_fulfillment',
        'update_updated_at_column',
        'validate_prescription_before_payment'
      );
    `;
    
    console.log('Function definitions:');
    for (const func of functions as any[]) {
      console.log('\n' + '='.repeat(80));
      console.log(`Function: ${func.function_name}`);
      console.log('='.repeat(80));
      console.log(func.function_definition);
    }

  } catch (error) {
    console.error('Error querying functions:', error);
  } finally {
    process.exit(0);
  }
}

main();
