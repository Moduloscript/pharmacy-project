// Simple test route to verify HEAD is working
export async function GET() {
  return new Response('GET works', { 
    status: 200,
    headers: { 'Content-Type': 'text/plain' }
  });
}

export async function HEAD() {
  console.log('[test-head] HEAD request received');
  return new Response(null, { 
    status: 200,
    headers: { 
      'Content-Type': 'text/plain',
      'Content-Length': '9',
      'X-Test-Head': 'working'
    }
  });
}