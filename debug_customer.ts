
import { db } from './packages/database';

async function main() {
  const email = 'falayetobi7@gmail.com';
  console.log(`Checking user with email: ${email}`);

  const user = await db.user.findUnique({
    where: { email },
    include: { customer: true }
  });

  if (!user || !user.customer) {
    console.log('User or customer profile not found');
    return;
  }

  const rawDocs = user.customer.verificationDocuments;
  console.log('Raw verificationDocuments value (JSON stringified):', JSON.stringify(rawDocs));
  console.log('Type of rawDocs:', typeof rawDocs);

  if (rawDocs) {
    try {
      const parsed = JSON.parse(rawDocs);
      console.log('Parsed successfully:', parsed);
      console.log('Is Array?', Array.isArray(parsed));
      console.log('Array length:', parsed.length);
    } catch (e) {
      console.error('JSON.parse failed:', (e as Error).message);
    }
  } else {
    console.log('verificationDocuments is null or undefined');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect();
  });
