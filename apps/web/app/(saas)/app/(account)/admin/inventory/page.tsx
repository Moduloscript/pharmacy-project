import { Metadata } from 'next';
import { InventoryTable } from '@saas/admin/components/InventoryTable';
import { AdminPageContainer } from '@saas/admin/components/AdminPageContainer';
import { getSession } from '@saas/auth/lib/server';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Inventory Management - BenPharm',
  description: 'Manage product inventory, track stock levels, and handle low stock alerts.',
};

export default async function AdminInventoryPage() {
  // Ensure user is authenticated and has admin role
  const session = await getSession();
  
  if (!session) {
    redirect('/auth/login');
  }
  
  if (session.user?.role !== 'admin') {
    redirect('/app');
  }

  return (
    <AdminPageContainer maxWidth="6xl">
      <div className="mb-10">
        <div className="flex items-start gap-3 sm:items-center mb-4">
          <div className="p-2 sm:p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg transition-colors shrink-0">
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold text-foreground leading-tight">Inventory Management</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 transition-colors">
                Stock Monitoring
              </span>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 rounded-xl p-6 border border-orange-200 dark:border-orange-800 transition-colors">
          <p className="text-muted-foreground text-lg leading-relaxed mb-4">
            <span className="font-semibold text-orange-900 dark:text-orange-100">Advanced Inventory Control System</span> - 
            Monitor real-time product stock levels, manage pharmaceutical inventory efficiently, and receive 
            intelligent alerts for optimal Nigerian pharmacy operations.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <svg className="w-4 h-4 text-orange-500 dark:text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Track product stock levels
            </div>
            <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <svg className="w-4 h-4 text-red-500 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Handle low stock alerts
            </div>
            <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <svg className="w-4 h-4 text-green-500 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Optimize inventory flow
            </div>
          </div>
        </div>
      </div>
      
      <InventoryTable />
    </AdminPageContainer>
  );
}
