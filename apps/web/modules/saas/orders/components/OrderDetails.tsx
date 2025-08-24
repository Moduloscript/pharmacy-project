'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/components/card'
import { Badge } from '@ui/components/badge'
import { Separator } from '@ui/components/separator'
import { toast } from 'sonner'
import { 
  Loader2, 
  ArrowLeft,
  Package, 
  Calendar, 
  MapPin, 
  Phone, 
  CreditCard,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  User,
  Mail,
  RefreshCw
} from 'lucide-react'
import { formatNaira } from '@/lib/nigerian-locations'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Simple status colors
const getStatusColor = (status: string) => {
  return 'bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'RECEIVED': return <Clock className="h-4 w-4" />
    case 'PROCESSING': return <AlertCircle className="h-4 w-4" />
    case 'READY': return <Package className="h-4 w-4" />
    case 'DISPATCHED': return <Truck className="h-4 w-4" />
    case 'DELIVERED': return <CheckCircle className="h-4 w-4" />
    case 'CANCELLED': return <XCircle className="h-4 w-4" />
    default: return <Clock className="h-4 w-4" />
  }
}

interface OrderDetailsProps {
  orderId: string
}

interface OrderItem {
  id: string
  productId: string
  product: {
    id: string
    name: string
    brandName?: string
    nafdacNumber?: string
    description?: string
  }
  quantity: number
  unitPrice: number
  subtotal: number
  productName: string
  productSKU: string
}

interface Order {
  id: string
  orderNumber: string
  status: string
  total: number
  subtotal: number
  deliveryFee: number
  discount: number
  deliveryMethod: string
  deliveryAddress: string
  deliveryCity: string
  deliveryState: string
  deliveryPhone: string
  paymentStatus: string
  paymentMethod?: string
  paymentReference?: string
  businessPONumber?: string
  estimatedDelivery?: string
  actualDelivery?: string
  specialInstructions?: string
  createdAt: string
  updatedAt: string
  customer: {
    id: string
    businessName?: string
    contactName: string
    email: string
    phone: string
  }
  items: OrderItem[]
  tracking: Array<{
    id: string
    status: string
    notes?: string
    timestamp: string
    updatedBy?: string
  }>
}

export function OrderDetails({ orderId }: OrderDetailsProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  
  // Fetch order details
  const { data: order, isLoading, error, refetch } = useQuery<Order>({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}`)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Order not found')
        }
        throw new Error('Failed to fetch order details')
      }
      const data = await response.json()
      return data.data.order
    }
  })
  
  // Cancel order mutation
  const cancelOrderMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to cancel order')
      }
      
      return response.json()
    },
    onSuccess: () => {
      toast.success('Your order has been successfully cancelled')
      
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (error) => {
      toast.error('Cancellation Failed: ' + error.message)
    }
  })
  
  const handleCancelOrder = () => {
    if (confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
      cancelOrderMutation.mutate()
    }
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }
  
  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-600 mb-2">
              {error.message === 'Order not found' ? 'Order Not Found' : 'Error Loading Order'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {error.message === 'Order not found' 
                ? 'This order does not exist or you do not have permission to view it.'
                : 'Failed to load order details'
              }
            </p>
            <div className="flex gap-2">
              <Button onClick={() => router.back()} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              {error.message !== 'Order not found' && (
                <Button onClick={() => refetch()}>
                  Try Again
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!order) return null
  
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Simple Header */}
      <div className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10 dark:bg-slate-900 dark:border-slate-800">
        <div className="container mx-auto py-6 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/app/orders">
                <Button variant="ghost" size="sm" className="hover:bg-slate-100 rounded-lg transition-all duration-200 dark:hover:bg-slate-800">
                  <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={1.5} />
                  Back to Orders
                </Button>
              </Link>
              
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-slate-100 rounded-lg dark:bg-slate-800">
                  <Package className="h-6 w-6 text-slate-700 dark:text-slate-300" strokeWidth={1.5} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    Order #{order.orderNumber}
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400">
                    Placed on {new Date(order.createdAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
            
            <span className={`${getStatusColor(order.status)} text-sm px-4 py-2 rounded-md font-medium`}>
              <span className="flex items-center space-x-2">
                {getStatusIcon(order.status)}
                <span>{order.status}</span>
              </span>
            </span>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto py-8 px-4 space-y-8">
      
        {/* Order Status Timeline */}
        <Card className="overflow-hidden border border-slate-200 shadow-sm bg-white rounded-lg dark:bg-slate-900 dark:border-slate-800">
          <CardHeader className="bg-slate-50 border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700">
            <CardTitle className="flex items-center gap-3 text-xl text-slate-900 dark:text-slate-100">
              <div className="p-2 bg-white rounded-lg border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
                <Package className="h-6 w-6 text-slate-700 dark:text-slate-300" strokeWidth={1.5} />
              </div>
              Order Tracking
            </CardTitle>
            <p className="text-slate-600 mt-2 dark:text-slate-400">Follow your order's journey from confirmation to delivery</p>
          </CardHeader>
          <CardContent className="p-8">
            <div className="relative">
              {/* Progress Line */}
              <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-slate-200 dark:bg-slate-700"></div>
              
              <div className="space-y-8">
                {order.tracking.map((track, index) => (
                  <div key={track.id} className="flex items-start gap-6 relative">
                    <div className="relative z-10 p-3 rounded-full bg-white border-2 border-slate-300 dark:bg-slate-800 dark:border-slate-600">
                      <div className="text-slate-700 dark:text-slate-300">
                        {getStatusIcon(track.status)}
                      </div>
                    </div>
                    <div className="flex-1 bg-white rounded-lg border border-slate-200 p-6 dark:bg-slate-900 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-semibold text-slate-900 capitalize dark:text-slate-100">
                          {track.status.toLowerCase()}
                        </h4>
                        <time className="text-sm text-slate-600 dark:text-slate-400">
                          {new Date(track.timestamp).toLocaleString('en-GB')}
                        </time>
                      </div>
                      {track.notes && (
                        <p className="text-slate-700 mb-2 leading-relaxed dark:text-slate-300">{track.notes}</p>
                      )}
                      {track.updatedBy && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Updated by: {track.updatedBy}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Customer Information Card */}
          <Card className="border border-slate-200 shadow-sm bg-white rounded-lg overflow-hidden dark:bg-slate-900 dark:border-slate-800">
            <CardHeader className="bg-slate-50 border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700">
              <CardTitle className="flex items-center gap-3 text-xl text-slate-900 dark:text-slate-100">
                <div className="p-2 bg-white rounded-lg border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
                  <User className="h-6 w-6 text-slate-700 dark:text-slate-300" strokeWidth={1.5} />
                </div>
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              {order.customer.businessName && (
                <div>
                  <p className="text-sm text-slate-600 mb-1 dark:text-slate-400">Business Name</p>
                  <p className="text-lg font-medium text-slate-900 dark:text-slate-100">{order.customer.businessName}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-slate-600 mb-1 dark:text-slate-400">Contact Name</p>
                <p className="text-lg font-medium text-slate-900 dark:text-slate-100">{order.customer.contactName}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1 dark:text-slate-400">Email Address</p>
                <p className="text-lg font-medium text-slate-900 dark:text-slate-100">{order.customer.email}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1 dark:text-slate-400">Phone Number</p>
                <p className="text-lg font-medium text-slate-900 dark:text-slate-100">{order.customer.phone}</p>
              </div>
            </CardContent>
          </Card>
        
          {/* Delivery Information Card */}
          <Card className="border border-slate-200 shadow-sm bg-white rounded-lg overflow-hidden dark:bg-slate-900 dark:border-slate-800">
            <CardHeader className="bg-slate-50 border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700">
              <CardTitle className="flex items-center gap-3 text-xl text-slate-900 dark:text-slate-100">
                <div className="p-2 bg-white rounded-lg border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
                  <Truck className="h-6 w-6 text-slate-700 dark:text-slate-300" strokeWidth={1.5} />
                </div>
                Delivery Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              <div>
                <p className="text-sm text-slate-600 mb-1 dark:text-slate-400">Delivery Method</p>
                <p className="text-lg font-medium text-slate-900 capitalize dark:text-slate-100">{order.deliveryMethod.toLowerCase()}</p>
              </div>
              
              {order.deliveryMethod !== 'PICKUP' && (
                <>
                  <div>
                    <p className="text-sm text-slate-600 mb-1 dark:text-slate-400">Delivery Address</p>
                    <p className="text-lg font-medium text-slate-900 dark:text-slate-100">{order.deliveryAddress}</p>
                    <p className="text-lg font-medium text-slate-900 dark:text-slate-100">{order.deliveryCity}, {order.deliveryState}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-slate-600 mb-1 dark:text-slate-400">Contact Phone</p>
                    <p className="text-lg font-medium text-slate-900 dark:text-slate-100">{order.deliveryPhone}</p>
                  </div>
                  
                  {order.estimatedDelivery && (
                    <div>
                      <p className="text-sm text-slate-600 mb-1 dark:text-slate-400">Estimated Delivery</p>
                      <p className="text-lg font-medium text-slate-900 dark:text-slate-100">
                        {new Date(order.estimatedDelivery).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  )}
                  
                  {order.actualDelivery && (
                    <div>
                      <p className="text-sm text-slate-600 mb-1 dark:text-slate-400">Delivered On</p>
                      <p className="text-lg font-medium text-slate-900 dark:text-slate-100">
                        {new Date(order.actualDelivery).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
      </div>
      
        {/* Payment Information Card */}
        <Card className="border border-slate-200 shadow-sm bg-white rounded-lg overflow-hidden dark:bg-slate-900 dark:border-slate-800">
          <CardHeader className="bg-slate-50 border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700">
            <CardTitle className="flex items-center gap-3 text-xl text-slate-900 dark:text-slate-100">
              <div className="p-2 bg-white rounded-lg border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
                <CreditCard className="h-6 w-6 text-slate-700 dark:text-slate-300" strokeWidth={1.5} />
              </div>
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-600 mb-2 dark:text-slate-400">Payment Status</p>
                <span className="text-lg font-medium text-slate-900 dark:text-slate-100">
                  {order.paymentStatus}
                </span>
              </div>
              
              {order.paymentMethod && (
                <div>
                  <p className="text-sm text-slate-600 mb-1 dark:text-slate-400">Payment Method</p>
                  <p className="text-lg font-medium text-slate-900 dark:text-slate-100">{order.paymentMethod}</p>
                </div>
              )}
              
              {order.paymentReference && (
                <div>
                  <p className="text-sm text-slate-600 mb-1 dark:text-slate-400">Payment Reference</p>
                  <p className="text-sm font-mono text-slate-900 bg-slate-100 px-2 py-1 rounded dark:text-slate-100 dark:bg-slate-800">{order.paymentReference}</p>
                </div>
              )}
              
              {order.businessPONumber && (
                <div>
                  <p className="text-sm text-slate-600 mb-1 dark:text-slate-400">Purchase Order Number</p>
                  <p className="text-sm font-mono text-slate-900 bg-slate-100 px-2 py-1 rounded dark:text-slate-100 dark:bg-slate-800">{order.businessPONumber}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      
        {/* Order Items */}
        <Card className="border border-slate-200 shadow-sm bg-white rounded-lg overflow-hidden dark:bg-slate-900 dark:border-slate-800">
          <CardHeader className="bg-slate-50 border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700">
            <CardTitle className="flex items-center gap-3 text-xl text-slate-900 dark:text-slate-100">
              <div className="p-2 bg-white rounded-lg border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
                <FileText className="h-6 w-6 text-slate-700 dark:text-slate-300" strokeWidth={1.5} />
              </div>
              Order Items
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-slate-900 mb-2 dark:text-slate-100">{item.product.name}</h3>
                    <div className="space-y-1">
                      {item.product.brandName && (
                        <p className="text-sm text-slate-600 dark:text-slate-400">Brand: {item.product.brandName}</p>
                      )}
                      {item.product.nafdacNumber && (
                        <p className="text-sm text-slate-600 dark:text-slate-400">NAFDAC: {item.product.nafdacNumber}</p>
                      )}
                      <p className="text-sm text-slate-600 dark:text-slate-400">SKU: {item.productSKU}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-slate-700 mb-1 dark:text-slate-300">{formatNaira(item.unitPrice)} × {item.quantity}</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{formatNaira(item.subtotal)}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <Separator className="my-8" />
            
            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
              <div className="space-y-3">
                <div className="flex justify-between text-slate-700 dark:text-slate-300">
                  <span>Subtotal</span>
                  <span>{formatNaira(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-700 dark:text-slate-300">
                  <span>Delivery Fee</span>
                  <span>{formatNaira(order.deliveryFee)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-slate-700 dark:text-slate-300">
                    <span>Discount</span>
                    <span>-{formatNaira(order.discount)}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between text-xl font-bold text-slate-900 dark:text-slate-100">
                  <span>Total</span>
                  <span>{formatNaira(order.total)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Special Instructions */}
        {order.specialInstructions && (
          <Card className="border border-slate-200 shadow-sm bg-white rounded-lg overflow-hidden dark:bg-slate-900 dark:border-slate-800">
            <CardHeader className="bg-slate-50 border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700">
              <CardTitle className="flex items-center gap-3 text-xl text-slate-900 dark:text-slate-100">
                <div className="p-2 bg-white rounded-lg border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
                  <FileText className="h-6 w-6 text-slate-700 dark:text-slate-300" strokeWidth={1.5} />
                </div>
                Special Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <p className="text-slate-700 text-lg leading-relaxed dark:text-slate-300">
                {order.specialInstructions}
              </p>
            </CardContent>
          </Card>
        )}
        
        {/* Actions */}
        <Card className="border border-slate-200 shadow-sm bg-white rounded-lg overflow-hidden dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="p-8">
            <div className="flex flex-col sm:flex-row gap-4">
              {['RECEIVED', 'PROCESSING'].includes(order.status) && (
                <Button
                  variant="destructive"
                  onClick={handleCancelOrder}
                  disabled={cancelOrderMutation.isPending}
                  className="rounded-lg h-12 px-6"
                >
                  {cancelOrderMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Cancelling Order...
                    </>
                  ) : (
                    'Cancel Order'
                  )}
                </Button>
              )}
              
              {order.status === 'DELIVERED' && (
                <Button 
                  variant="secondary" 
                  className="rounded-lg h-12 px-6"
                >
                  Reorder Items
                </Button>
              )}
              
              <Button 
                variant="outline" 
                className="rounded-lg h-12 px-6 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Download Invoice
              </Button>
              
              <Button 
                variant="outline" 
                className="rounded-lg h-12 px-6 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
