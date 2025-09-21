// Simple test route to verify HEAD is working
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not Found', { status: 404 });
  }
  return new Response('GET works', { 
    status: 200,
    headers: { 'Content-Type': 'text/plain' }
  });
}

export async function HEAD() {
  if (process.env.NODE_ENV === 'production') {
    return new Response(null, { status: 404 });
  }
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
