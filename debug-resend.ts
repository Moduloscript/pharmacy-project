import 'dotenv/config';

async function testEmail() {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    console.error('❌ RESEND_API_KEY is missing from environment');
    process.exit(1);
  }

  console.log(`🔑 Key found: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 4)}`);
  console.log('📡 Attempting to send test email to api.resend.com...');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from: 'onboarding@ben-pharma.com',
        to: 'delivered@resend.dev', // safe test address
        subject: 'Debug Test',
        html: '<p>Direct debug test</p>'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Email sent successfully!', data);
    } else {
      console.error(`❌ Request failed with status ${response.status}`);
      const text = await response.text();
      console.error('Response:', text);
    }
  } catch (err: any) {
    console.error('❌ Fetch error:', err);
    if (err.cause) console.error('Cause:', err.cause);
  }
}

testEmail();
