// Quick verification script for Termii settings
const envVars = {
  TERMII_API_KEY: process.env.TERMII_API_KEY,
  SMS_API_KEY: process.env.SMS_API_KEY,
  TERMII_SENDER_ID: process.env.TERMII_SENDER_ID,
  SMS_SENDER_ID: process.env.SMS_SENDER_ID
};

console.log('=== Termii Environment Verification ===');
console.log('1. API Key Sources:');
console.log('   - TERMII_API_KEY:', envVars.TERMII_API_KEY ? 'SET ✓' : 'NOT SET');
console.log('   - SMS_API_KEY:', envVars.SMS_API_KEY ? 'SET ✓' : 'NOT SET');
console.log('');
console.log('2. Sender ID Sources:');
console.log('   - TERMII_SENDER_ID:', envVars.TERMII_SENDER_ID || 'NOT SET (defaults to BenPharm)');
console.log('   - SMS_SENDER_ID:', envVars.SMS_SENDER_ID || 'NOT SET');
console.log('');
console.log('3. What the code will use:');
console.log('   - API Key:', (envVars.TERMII_API_KEY || envVars.SMS_API_KEY) ? 'AVAILABLE ✓' : 'MISSING ✗');
console.log('   - Sender:', envVars.TERMII_SENDER_ID || envVars.SMS_SENDER_ID || 'BenPharm (default)');
