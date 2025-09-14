import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AdminOrderDetails } from '@/modules/saas/admin/components/AdminOrderDetails'
import { getSession } from '@saas/auth/lib/server'

export const metadata: Metadata = {
  title: 'Admin • Order Details - BenPharm',
  description: 'View and manage detailed information about a customer order'
}

export default async function AdminOrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // Require authenticated admin
  const session = await getSession()
  if (!session) {
    redirect('/auth/login')
  }
  if (session.user?.role !== 'admin') {
    redirect('/app')
  }

  const { id } = await params

  return <AdminOrderDetails orderId={id} />
}

