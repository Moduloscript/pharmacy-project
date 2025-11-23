import 'dotenv/config';

const API_URL = 'https://api.ng.termii.com/api';

function normalizeNigerianPhone(phone: string): string {
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');
    
    // Convert to +234 format
    if (cleaned.startsWith('234')) {
        return `+${cleaned}`;
    }
    if (cleaned.startsWith('0')) {
        return `+234${cleaned.substring(1)}`;
    }
    if (cleaned.length === 10) {
        return `+234${cleaned}`;
    }
    
    throw new Error(`Invalid Nigerian phone number: ${phone}`);
}

async function testTermii() {
    const apiKey = process.env.TERMII_API_KEY || process.env.SMS_API_KEY;
    const senderId = process.env.TERMII_SENDER_ID || process.env.SMS_SENDER_ID || 'BenPharm';
    
    if (!apiKey) {
        console.error('❌ Error: TERMII_API_KEY or SMS_API_KEY environment variable is not set.');
        process.exit(1);
    }

    const phoneNumber = process.argv[2];
    if (!phoneNumber) {
        console.error('❌ Error: Please provide a phone number as an argument.');
        console.log('Usage: npx tsx scripts/debug-termii.ts <phone_number>');
        process.exit(1);
    }

    try {
        console.log(`🔍 Testing Termii connection...`);
        console.log(`API Key: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 5)}`);
        console.log(`Sender ID: ${senderId}`);
        console.log(`Target Phone: ${phoneNumber}`);

        // 1. Test Connection / Balance
        console.log('\n1️⃣  Checking Account Balance...');
        const balanceRes = await fetch(`${API_URL}/get-balance?api_key=${apiKey}`);
        const balanceData = await balanceRes.json();
        
        if (balanceRes.ok) {
            console.log('✅ Balance Check Success:', JSON.stringify(balanceData, null, 2));
        } else {
            console.error('❌ Balance Check Failed:', JSON.stringify(balanceData, null, 2));
            // We continue anyway to test sending
        }

        // 2. Send Test Message
        console.log('\n2️⃣  Sending Test Message...');
        const normalizedPhone = normalizeNigerianPhone(phoneNumber);
        console.log(`Normalized Phone: ${normalizedPhone}`);
        
        const payload = {
            api_key: apiKey,
            to: normalizedPhone.replace('+', ''), // Remove + prefix for Termii
            from: senderId,
            sms: "This is a test message from BenPharma debug script.",
            type: 'plain',
            channel: 'generic', 
        };

        console.log('Request Payload:', JSON.stringify({ ...payload, api_key: '***' }, null, 2));

        const sendRes = await fetch(`${API_URL}/sms/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const sendData = await sendRes.json();

        if (sendRes.ok && sendData.message_id) {
            console.log('✅ Message Sent Successfully!');
            console.log('Response:', JSON.stringify(sendData, null, 2));
        } else {
            console.error('❌ Message Sending Failed!');
            console.log('Status:', sendRes.status);
            console.log('Response:', JSON.stringify(sendData, null, 2));
        }

    } catch (error) {
        console.error('❌ Unexpected Error:', error);
    }
}

testTermii();
