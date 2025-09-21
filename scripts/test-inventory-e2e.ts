/*
 End-to-end sanity test for inventory endpoints.
 Usage (PowerShell):
   $env:API_BASE="http://localhost:3000"; $env:ADMIN_COOKIE="session=..."; $env:PRODUCT_ID="<id>"; pnpm exec tsx scripts/test-inventory-e2e.ts

 Notes:
 - ADMIN_COOKIE should be a valid admin session cookie string for your dev server.
 - This script performs:
   1) List batches
   2) Create batch BN-E2E
   3) Create IN adjustment of 3 into BN-E2E
   4) List movements (should include the new IN)
*/

const API_BASE = process.env.API_BASE || "http://localhost:3000";
const PRODUCT_ID = process.env.PRODUCT_ID;
const ADMIN_COOKIE = process.env.ADMIN_COOKIE; // session cookie for admin

if (!PRODUCT_ID) {
  console.error("PRODUCT_ID env var is required");
  process.exit(1);
}

async function req(path: string, init: RequestInit = {}) {
  const url = `${API_BASE}/api${path}`;
  const headers: any = { ...(init.headers || {}), 'Content-Type': 'application/json' };
  if (ADMIN_COOKIE) headers['cookie'] = ADMIN_COOKIE;
  const res = await fetch(url, { ...init, headers });
  const bodyText = await res.text();
  let body: any;
  try { body = JSON.parse(bodyText); } catch { body = bodyText; }
  return { status: res.status, body };
}

async function main() {
  console.log("API_BASE=", API_BASE);
  console.log("PRODUCT_ID=", PRODUCT_ID);

  // 1) List batches
  let r = await req(`/admin/products/${PRODUCT_ID}/batches?page=1&pageSize=10`);
  console.log("List batches:", r.status, Array.isArray(r.body?.data) ? r.body.data.length : r.body);

  // 2) Create batch
  r = await req(`/admin/products/${PRODUCT_ID}/batches`, {
    method: 'POST',
    body: JSON.stringify({ batchNumber: 'BN-E2E', qty: 0 })
  });
  console.log("Create batch BN-E2E:", r.status, r.body?.id || r.body);

  // 3) Create IN adjustment into BN-E2E
  r = await req(`/admin/products/${PRODUCT_ID}/adjustments`, {
    method: 'POST',
    body: JSON.stringify({ type: 'IN', qty: 3, batchNumber: 'BN-E2E', idempotencyKey: `e2e-${Date.now()}` })
  });
  console.log("Create IN adjustment:", r.status, r.body?.id || r.body);

  // 4) List movements
  r = await req(`/admin/products/${PRODUCT_ID}/movements?page=1&pageSize=10&type=IN`);
  console.log("List IN movements:", r.status, Array.isArray(r.body?.data) ? r.body.data.length : r.body);
}

main().catch((e) => {
  console.error("E2E failed:", e);
  process.exit(1);
});
