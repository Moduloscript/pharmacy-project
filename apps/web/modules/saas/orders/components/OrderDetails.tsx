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

// Order status colors
const getStatusColor = (status: string) => {
  switch (status) {
    case 'RECEIVED': return 'bg-blue-100 text-blue-800'
    case 'PROCESSING': return 'bg-yellow-100 text-yellow-800'
    case 'READY': return 'bg-purple-100 text-purple-800'
    case 'DISPATCHED': return 'bg-orange-100 text-orange-800'
    case 'DELIVERED': return 'bg-green-100 text-green-800'
    case 'CANCELLED': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/app/orders">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Order #{order.orderNumber}</h1>
            <p className="text-muted-foreground">
              Placed on {new Date(order.createdAt).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
        </div>
        
        <Badge className={`${getStatusColor(order.status)} text-sm px-3 py-1`}>
          {getStatusIcon(order.status)}
          <span className="ml-1">{order.status}</span>
        </Badge>
      </div>
      
      {/* Order Status Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.tracking.map((track, index) => (
              <div key={track.id} className="flex items-start gap-4">
                <div className={`p-2 rounded-full ${getStatusColor(track.status)}`}>
                  {getStatusIcon(track.status)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium capitalize">{track.status.toLowerCase()}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(track.timestamp).toLocaleString('en-GB')}
                    </p>
                  </div>
                  {track.notes && (
                    <p className="text-sm text-muted-foreground">{track.notes}</p>
                  )}
                  {track.updatedBy && (
                    <p className="text-xs text-muted-foreground">Updated by: {track.updatedBy}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.customer.businessName && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Business Name</p>
                <p>{order.customer.businessName}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">Contact Name</p>
              <p>{order.customer.contactName}</p>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <p>{order.customer.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <p>{order.customer.phone}</p>
            </div>
          </CardContent>
        </Card>
        
        {/* Delivery Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Delivery Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Delivery Method</p>
              <p className="capitalize">{order.deliveryMethod.toLowerCase()}</p>
            </div>
            
            {order.deliveryMethod !== 'PICKUP' && (
              <>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Delivery Address</p>
                    <p>{order.deliveryAddress}</p>
                    <p>{order.deliveryCity}, {order.deliveryState}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p>{order.deliveryPhone}</p>
                </div>
                
                {order.estimatedDelivery && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Estimated Delivery</p>
                    <p>{new Date(order.estimatedDelivery).toLocaleDateString('en-GB')}</p>
                  </div>
                )}
                
                {order.actualDelivery && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Actual Delivery</p>
                    <p>{new Date(order.actualDelivery).toLocaleDateString('en-GB')}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Payment Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Payment Status</p>
              <Badge variant="outline" className={
                order.paymentStatus === 'COMPLETED' ? 'border-green-200 text-green-800' :
                order.paymentStatus === 'FAILED' ? 'border-red-200 text-red-800' :
                'border-yellow-200 text-yellow-800'
              }>
                {order.paymentStatus}
              </Badge>
            </div>
            
            {order.paymentMethod && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
                <p>{order.paymentMethod}</p>
              </div>
            )}
            
            {order.paymentReference && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Payment Reference</p>
                <p className="font-mono text-sm">{order.paymentReference}</p>
              </div>
            )}
            
            {order.businessPONumber && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Purchase Order Number</p>
                <p className="font-mono text-sm">{order.businessPONumber}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Order Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h3 className="font-medium">{item.product.name}</h3>
                  {item.product.brandName && (
                    <p className="text-sm text-muted-foreground">Brand: {item.product.brandName}</p>
                  )}
                  {item.product.nafdacNumber && (
                    <p className="text-sm text-muted-foreground">NAFDAC: {item.product.nafdacNumber}</p>
                  )}
                  <p className="text-sm text-muted-foreground">SKU: {item.productSKU}</p>
                </div>
                
                <div className="text-right">
                  <p className="font-medium">{formatNaira(item.unitPrice)} x {item.quantity}</p>
                  <p className="text-lg font-semibold">{formatNaira(item.subtotal)}</p>
                </div>
              </div>
            ))}
          </div>
          
          <Separator className="my-6" />
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatNaira(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span>{formatNaira(order.deliveryFee)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatNaira(order.discount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span>{formatNaira(order.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Special Instructions */}
      {order.specialInstructions && (
        <Card>
          <CardHeader>
            <CardTitle>Special Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{order.specialInstructions}</p>
          </CardContent>
        </Card>
      )}
      
      {/* Actions */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {['RECEIVED', 'PROCESSING'].includes(order.status) && (
              <Button
                variant="destructive"
                onClick={handleCancelOrder}
                disabled={cancelOrderMutation.isPending}
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
              <Button variant="secondary">
                Reorder Items
              </Button>
            )}
            
            <Button variant="outline">
              Download Invoice
            </Button>
            
            <Button variant="outline">
              Contact Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
