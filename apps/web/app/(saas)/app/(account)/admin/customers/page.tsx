import { Metadata } from 'next';
import { CustomersTable } from '@saas/admin/components/CustomersTable';
import { getSession } from '@saas/auth/lib/server';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Customers Management - BenPharm',
  description: 'Manage customer accounts, business verifications, and customer relationships.',
};

export default async function AdminCustomersPage() {
  // Ensure user is authenticated and has admin role
  const session = await getSession();
  
  if (!session) {
    redirect('/auth/login');
  }
  
  if (session.user?.role !== 'admin') {
    redirect('/app');
  }

  return (
    <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg transition-colors">
            <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-foreground leading-tight">Customers Management</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 transition-colors">
                Active Customers
              </span>
            </div>
          </div>
        </div>

        <details className="group rounded-xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 transition-colors">
          <summary className="list-none cursor-pointer px-6 py-4 flex items-center justify-between">
            <span className="font-semibold text-emerald-900 dark:text-emerald-100">Customer Relationship Management Center</span>
            <span className="text-sm text-muted-foreground">
              <span className="group-open:hidden">Show details</span>
              <span className="hidden group-open:inline">Hide details</span>
            </span>
          </summary>
          <div className="px-6 pb-6">
            <p className="text-muted-foreground leading-relaxed mb-4">
              Streamline customer account management, verify business registrations, and maintain strong
              relationships with healthcare providers and pharmaceutical clients.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <svg className="w-4 h-4 text-emerald-500 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Manage customer accounts
              </div>
              <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <svg className="w-4 h-4 text-blue-500 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Verify business registrations
              </div>
              <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <svg className="w-4 h-4 text-purple-500 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Track relationships
              </div>
            </div>
          </div>
        </details>
      </div>
      
      <CustomersTable />
    </div>
  );
}
