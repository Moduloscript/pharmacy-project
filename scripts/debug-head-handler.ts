#!/usr/bin/env tsx

async function testImageProxy() {
  const testUrl = "http://localhost:3000/image-proxy/prescriptions/gtUswB8aQF50wBrID7WhFqPPBbsl2Ada%2Fcmfnsvev7000nu3o0rqaxnizr%2F1758102593291.pdf";
  
  console.log('🔍 Testing image-proxy endpoint...\n');
  
  let getResponse: Response;
  let headResponse: Response;
  
  // Test GET request
  console.log('Testing GET request:');
  try {
    getResponse = await fetch(testUrl, { method: 'GET' });
    console.log(`✅ GET Status: ${getResponse.status} ${getResponse.statusText}`);
    console.log(`✅ GET Content-Type: ${getResponse.headers.get('content-type')}`);
    console.log(`✅ GET Content-Length: ${getResponse.headers.get('content-length')}`);
    
    // Read first few bytes to confirm it's PDF
    const buffer = await getResponse.arrayBuffer();
    const firstBytes = new Uint8Array(buffer.slice(0, 10));
    const pdfSignature = Array.from(firstBytes).map(b => String.fromCharCode(b)).join('');
    console.log(`✅ GET First bytes: "${pdfSignature}" (should start with %PDF)`);
  } catch (err) {
    console.log(`❌ GET Error: ${(err as Error).message}`);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test HEAD request
  console.log('Testing HEAD request:');
  try {
    headResponse = await fetch(testUrl, { method: 'HEAD' });
    console.log(`${headResponse.ok ? '✅' : '❌'} HEAD Status: ${headResponse.status} ${headResponse.statusText}`);
    console.log(`${headResponse.ok ? '✅' : '❌'} HEAD Content-Type: ${headResponse.headers.get('content-type')}`);
    console.log(`${headResponse.ok ? '✅' : '❌'} HEAD Content-Length: ${headResponse.headers.get('content-length')}`);
    console.log(`${headResponse.ok ? '✅' : '❌'} HEAD Accept-Ranges: ${headResponse.headers.get('accept-ranges')}`);
    
    if (!headResponse.ok) {
      const errorText = await headResponse.text();
      console.log(`❌ HEAD Error body: "${errorText}"`);
    }
  } catch (err) {
    console.log(`❌ HEAD Error: ${(err as Error).message}`);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  console.log('🏁 Diagnosis:');
  
  if (getResponse!.ok && !headResponse!.ok) {
    console.log('❌ Issue: GET works but HEAD fails');
    console.log('🔧 Solution: Fix the HEAD handler in image-proxy route');
    console.log('📝 PDF.js requires HEAD requests to work for proper loading');
    console.log('\n💡 The issue is in apps/web/app/image-proxy/[...path]/route.ts');
    console.log('   The HEAD handler is returning 403 while GET works fine');
  } else if (getResponse!.ok && headResponse!.ok) {
    console.log('✅ Both GET and HEAD work - the issue might be elsewhere');
  } else {
    console.log('❌ Both requests are failing - check storage configuration');
  }
}

// Run the test
testImageProxy().catch(console.error);