'use client'

import { FileText, Download, Loader2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@ui/components/card'
import { Button } from '@ui/components/button'
import { useOrders } from '@/modules/saas/orders/lib/queries'
import { Alert, AlertDescription } from '@ui/components/alert'
import { Skeleton } from '@ui/components/skeleton'
import { Badge } from '@ui/components/badge'

export default function InvoicesPage() {
  const { data, isLoading, error } = useOrders({
    // Filter for orders that are likely to have invoices (e.g. not cancelled)
    // Adjust filters as per business logic. Usually invoices are for PAID orders.
    paymentStatus: ['paid', 'pending', 'partial'], 
  }, 1, 50);

  const orders = data?.orders || [];

  const handleDownload = (orderId: string) => {
    // Direct link to the API route
    window.open(`/api/invoices/${orderId}/download`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg">
                  <FileText className="h-8 w-8 text-white" strokeWidth={1.5} />
              </div>
              <div>
                  <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">
                  Invoices
                  </h1>
                  <p className="text-slate-600 mt-1 text-lg dark:text-slate-400">
                  View and download your billing statements
                  </p>
              </div>
              </div>
          </div>

          {error && (
            <Alert variant="error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load invoices. Please try again later.
              </AlertDescription>
            </Alert>
          )}

          <Card>
              <CardHeader>
                  <CardTitle>Recent Invoices</CardTitle>
                  <CardDescription>
                    Download PDF invoices for your orders.
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  {isLoading ? (
                     <div className="space-y-4">
                       {[1, 2, 3].map((i) => (
                         <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                           <div className="space-y-2">
                             <Skeleton className="h-4 w-48" />
                             <Skeleton className="h-4 w-24" />
                           </div>
                           <Skeleton className="h-10 w-10" />
                         </div>
                       ))}
                     </div>
                  ) : orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500">
                        <FileText className="h-12 w-12 mb-4 opacity-20" />
                        <p>No invoices available yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order: any) => (
                        <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                          <div className="flex flex-col md:flex-row md:items-center gap-4">
                             <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
                               <FileText className="h-6 w-6 text-slate-500" />
                             </div>
                             <div>
                               <div className="font-semibold text-slate-900 dark:text-slate-100">
                                 Invoice #{order.invoiceNumber || order.orderNumber}
                               </div>
                               <div className="text-sm text-slate-500 flex gap-2 items-center">
                                 <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                                 <span>•</span>
                                 <span className="font-medium">₦{order.total.toLocaleString()}</span>
                               </div>
                             </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                             <Badge variant={order.paymentInfo?.status === 'paid' ? 'default' : 'secondary'}>
                               {order.paymentInfo?.status || 'Pending'}
                             </Badge>
                             <Button size="sm" variant="outline" onClick={() => handleDownload(order.id)}>
                               <Download className="h-4 w-4 mr-2" />
                               Download
                             </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
