#!/usr/bin/env tsx

async function testPdfHeaders() {
  const url = "http://localhost:3000/image-proxy/prescriptions/gtUswB8aQF50wBrID7WhFqPPBbsl2Ada%2Fcmfnsvev7000nu3o0rqaxnizr%2F1758102593291.pdf";
  
  console.log('🔍 Testing PDF headers with different methods...\n');
  
  // Test 1: HEAD request with curl-like headers
  console.log('Test 1: HEAD request (browser-like)');
  try {
    const headResp = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
      }
    });
    
    console.log(`Status: ${headResp.status} ${headResp.statusText}`);
    console.log('Headers:');
    headResp.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });
    
    // Check if it's a 204
    if (headResp.status === 204) {
      console.log('\n❌ ERROR: Server is returning 204 No Content for HEAD requests!');
      console.log('This will cause PDF.js to fail.');
    }
  } catch (err) {
    console.error('HEAD request failed:', err);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 2: OPTIONS request
  console.log('Test 2: OPTIONS request (CORS preflight)');
  try {
    const optionsResp = await fetch(url, {
      method: 'OPTIONS',
    });
    
    console.log(`Status: ${optionsResp.status} ${optionsResp.statusText}`);
    console.log('CORS Headers:');
    console.log(`  Access-Control-Allow-Origin: ${optionsResp.headers.get('Access-Control-Allow-Origin')}`);
    console.log(`  Access-Control-Allow-Methods: ${optionsResp.headers.get('Access-Control-Allow-Methods')}`);
    console.log(`  Access-Control-Allow-Headers: ${optionsResp.headers.get('Access-Control-Allow-Headers')}`);
  } catch (err) {
    console.error('OPTIONS request failed:', err);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 3: Range request
  console.log('Test 3: Range request (PDF.js behavior)');
  try {
    const rangeResp = await fetch(url, {
      method: 'GET',
      headers: {
        'Range': 'bytes=0-1023',
      }
    });
    
    console.log(`Status: ${rangeResp.status} ${rangeResp.statusText}`);
    console.log(`Content-Range: ${rangeResp.headers.get('content-range')}`);
    console.log(`Accept-Ranges: ${rangeResp.headers.get('accept-ranges')}`);
    console.log(`Content-Length: ${rangeResp.headers.get('content-length')}`);
    
    if (rangeResp.status === 206) {
      console.log('✅ Range requests are supported');
    } else {
      console.log('⚠️ Range requests may not be supported');
    }
  } catch (err) {
    console.error('Range request failed:', err);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  console.log('🏁 Summary:');
  console.log('1. Restart your Next.js server if you haven\'t already');
  console.log('2. Clear browser cache and try again');
  console.log('3. Check browser DevTools Network tab for the actual failing request');
}

testPdfHeaders().catch(console.error);