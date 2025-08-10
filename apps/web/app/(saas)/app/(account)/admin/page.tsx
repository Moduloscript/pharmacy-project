import { Metadata } from 'next';
import { AdminDashboard } from '@saas/admin/components/AdminDashboard';
import { getSession } from '@saas/auth/lib/server';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Admin Dashboard - BenPharm',
  description: 'Overview of BenPharm operations, metrics, and system health.',
};

export default async function AdminDashboardPage() {
  // Ensure user is authenticated and has admin role
  const session = await getSession();
  
  if (!session) {
    redirect('/auth/login');
  }
  
  if (session.user?.role !== 'admin') {
    redirect('/app');
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <AdminDashboard />
    </div>
  );
}
