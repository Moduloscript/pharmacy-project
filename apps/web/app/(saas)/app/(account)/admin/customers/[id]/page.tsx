import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getSession } from '@saas/auth/lib/server';
import { Card } from '@ui/components/card';
import { Badge } from '@ui/components/badge';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Customer Detail - BenPharm',
};

function getVerificationBadgeColor(status?: string | null) {
  if (!status) return 'bg-gray-100 text-gray-800';
  switch (status.toLowerCase()) {
    case 'verified':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'rejected':
      return 'bg-red-100 text-red-800';
    case 'expired':
      return 'bg-gray-200 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect('/auth/login');
  if (session.user?.role !== 'admin') redirect('/app');

  const { id } = await params;

  // Build an absolute base URL for server-side fetches
  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  const host = h.get('host') ?? 'localhost:3000';
  const base = process.env.NEXT_PUBLIC_API_URL || `${proto}://${host}`;

  const cookie = h.get('cookie') || '';
  const res = await fetch(`${base}/api/admin/customers/${id}`, {
    cache: 'no-store',
    headers: {
      cookie,
    },
  });
  if (!res.ok) {
    return (
      <div className="mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/app/admin/customers" className="text-sm text-blue-600 hover:underline">← Back to Customers</Link>
        </div>
        <Card className="p-6">
          <p className="text-red-600">Failed to load customer (status {res.status}).</p>
        </Card>
      </div>
    );
  }
  const customer: any = await res.json();

  const verifiedAt = customer?.verifiedAt ? new Date(customer.verifiedAt).toLocaleString() : null;

  return (
    <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customer Detail</h1>
          <p className="text-sm text-muted-foreground">ID: {customer?.id}</p>
        </div>
        <Link href="/app/admin/customers" className="text-sm text-blue-600 hover:underline">← Back to Customers</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold">{customer?.user?.name ?? 'Customer'}</h2>
              <p className="text-sm text-muted-foreground">{customer?.user?.email}</p>
            </div>
            <Badge className={getVerificationBadgeColor(customer?.verificationStatus)}>
              {customer?.verificationStatus ?? 'PENDING'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div>
              <p className="text-xs text-muted-foreground">Customer Type</p>
              <p className="font-medium">{customer?.customerType}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="font-medium">{customer?.phone ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Business Name</p>
              <p className="font-medium">{customer?.businessName ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Business Email</p>
              <p className="font-medium">{customer?.businessEmail ?? '—'}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-muted-foreground">Business Address</p>
              <p className="font-medium">{customer?.businessAddress ?? '—'}</p>
            </div>
          </div>
        </Card>

        {/* Verification card */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Verification</h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge className={getVerificationBadgeColor(customer?.verificationStatus)}>
                {customer?.verificationStatus ?? 'PENDING'}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Verified At</p>
              <p className="font-medium">{verifiedAt ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rejection Reason</p>
              <p className="font-medium whitespace-pre-wrap">{customer?.rejectionReason ?? '—'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Documents */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-2">Verification Documents</h3>
        {Array.isArray(customer?.verificationDocuments) && customer.verificationDocuments.length > 0 ? (
          <ul className="list-disc pl-5 space-y-1">
            {customer.verificationDocuments.map((doc: string, i: number) => (
              <li key={i} className="text-sm break-all">{doc}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No documents on file.</p>
        )}
      </Card>
    </div>
  );
}
