'use client'

import { atom, useAtom } from 'jotai'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/components/card'
import { Input } from '@ui/components/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/components/select'
import { Badge } from '@ui/components/badge'
import { toast } from 'sonner'
import { 
  Loader2, 
  Package, 
  Calendar, 
  MapPin, 
  Phone, 
  CreditCard,
  Truck,
  Search,
  Filter,
  Eye,
  X,
  RefreshCw
} from 'lucide-react'
import { formatNaira } from '@/lib/nigerian-locations'
import Link from 'next/link'

// Local atoms for order management
const orderFiltersAtom = atom({
  status: '',
  search: '',
  page: 1,
  limit: 10
})

const selectedOrderAtom = atom<string | null>(null)

// Material Design status colors with controlled brightness
const getStatusColor = (status: string) => {
  switch (status) {
    case 'RECEIVED': return 'bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800'
    case 'PROCESSING': return 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
    case 'READY': return 'bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
    case 'DISPATCHED': return 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
    case 'DELIVERED': return 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
    case 'CANCELLED': return 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
    default: return 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
  }
}

// Order status descriptions
const getStatusDescription = (status: string) => {
  switch (status) {
    case 'RECEIVED': return 'Order received and is being processed'
    case 'PROCESSING': return 'Preparing your order'
    case 'READY': return 'Ready for pickup or dispatch'
    case 'DISPATCHED': return 'Out for delivery'
    case 'DELIVERED': return 'Successfully delivered'
    case 'CANCELLED': return 'Order was cancelled'
    default: return status
  }
}

interface OrderItem {
  id: string
  productId: string
  product: {
    id: string
    name: string
    brandName?: string
    nafdacNumber?: string
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
  estimatedDelivery?: string
  actualDelivery?: string
  createdAt: string
  updatedAt: string
  items: OrderItem[]
  tracking: Array<{
    id: string
    status: string
    notes?: string
    timestamp: string
    updatedBy?: string
  }>
}

export function OrderHistory() {
  const queryClient = useQueryClient()
  
  // State
  const [filters, setFilters] = useAtom(orderFiltersAtom)
  const [selectedOrder, setSelectedOrder] = useAtom(selectedOrderAtom)
  
  // Fetch orders
  const { data: ordersData, isLoading, error, refetch } = useQuery({
    queryKey: ['orders', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.status) params.set('status', filters.status)
      if (filters.page) params.set('page', filters.page.toString())
      if (filters.limit) params.set('limit', filters.limit.toString())
      
      const response = await fetch(`/api/orders?${params}`)
      if (!response.ok) throw new Error('Failed to fetch orders')
      const data = await response.json()
      return data
    }
  })
  
  // Cancel order mutation
  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
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
    onSuccess: (data, orderId) => {
      toast.success('Your order has been successfully cancelled')
      
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setSelectedOrder(null)
    },
    onError: (error) => {
      toast.error('Cancellation Failed: ' + error.message)
    }
  })
  
  const handleStatusFilter = (status: string) => {
    const filterValue = status === 'all' ? '' : status
    setFilters(prev => ({ ...prev, status: filterValue, page: 1 }))
  }
  
  const handleSearch = (search: string) => {
    setFilters(prev => ({ ...prev, search, page: 1 }))
  }
  
  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }))
  }
  
  const handleCancelOrder = (orderId: string) => {
    if (confirm('Are you sure you want to cancel this order?')) {
      cancelOrderMutation.mutate(orderId)
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
            <h3 className="text-lg font-semibold text-red-600 mb-2">Error Loading Orders</h3>
            <p className="text-muted-foreground mb-4">Failed to load your order history</p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  const orders = ordersData?.data?.orders || []
  const pagination = ordersData?.data?.pagination
  
  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No orders yet</h2>
          <p className="text-muted-foreground mb-6">Your order history will appear here</p>
          <Link href="/app/products">
            <Button>Start Shopping</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Material Design Filters and Search */}
      <Card className="shadow-md border-0 bg-white dark:bg-slate-800">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-indigo-500 h-5 w-5" />
                <Input
                  placeholder="Search orders by number..."
                  value={filters.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 h-12 rounded-lg border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 dark:border-slate-700 dark:focus:border-indigo-400 dark:bg-slate-900 transition-all duration-200"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={filters.status || 'all'} onValueChange={handleStatusFilter}>
                <SelectTrigger className="w-[180px] h-12 rounded-lg border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-900 hover:border-indigo-300 transition-all duration-200">
                  <Filter className="h-4 w-4 mr-2 text-indigo-500" />
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="RECEIVED">Received</SelectItem>
                  <SelectItem value="PROCESSING">Processing</SelectItem>
                  <SelectItem value="READY">Ready</SelectItem>
                  <SelectItem value="DISPATCHED">Dispatched</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              
              {(filters.status || filters.search) && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setFilters(prev => ({ ...prev, status: '', search: '' }))}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Orders List */}
      <div className="space-y-4">
        {orders.map((order: Order) => (
          <Card key={order.id} className="overflow-hidden shadow-md border-0 hover:shadow-lg transition-all duration-300 dark:bg-slate-800">
            <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-800 border-b border-slate-100 dark:border-slate-700">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">Order #{order.orderNumber}</CardTitle>
                  <div className="flex items-center gap-2 mt-2 text-sm text-slate-500 dark:text-slate-400">
                    <Calendar className="h-4 w-4 text-indigo-500" />
                    {new Date(order.createdAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </div>
                </div>
                
                <div className="flex flex-col sm:items-end gap-3">
                  <span className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatNaira(order.total)}</p>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4 p-6">
              {/* Order Details with Material Design */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg dark:bg-slate-900">
                  <div className="p-2 bg-white rounded-lg shadow-sm dark:bg-slate-800">
                    <Truck className="h-4 w-4 text-indigo-500" />
                  </div>
                  <span className="capitalize text-sm font-medium text-slate-700 dark:text-slate-300">{order.deliveryMethod.toLowerCase()} Delivery</span>
                </div>
                
                {order.deliveryMethod !== 'PICKUP' && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg dark:bg-slate-900">
                    <div className="p-2 bg-white rounded-lg shadow-sm dark:bg-slate-800">
                      <MapPin className="h-4 w-4 text-emerald-500" />
                    </div>
                    <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{order.deliveryCity}, {order.deliveryState}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg dark:bg-slate-900">
                  <div className="p-2 bg-white rounded-lg shadow-sm dark:bg-slate-800">
                    <CreditCard className="h-4 w-4 text-amber-500" />
                  </div>
                  <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                    order.paymentStatus === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
                    order.paymentStatus === 'PENDING' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  }`}>
                    {order.paymentStatus}
                  </span>
                </div>
              </div>
              
              {/* Items Preview with Material Design */}
              <div className="border-t-2 border-slate-100 dark:border-slate-700 pt-4">
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  {(order.items?.length ?? 0) || (order as any).itemsCount || 0} item{(((order.items?.length ?? 0) || (order as any).itemsCount || 0) !== 1) ? 's' : ''}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {order.items.slice(0, 3).map((item: OrderItem) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                      <span className="truncate font-medium text-slate-700 dark:text-slate-300">{item.product.name}</span>
                      <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold dark:bg-indigo-900/30 dark:text-indigo-300">x{item.quantity}</span>
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <div className="p-3 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg text-center border border-dashed border-slate-300 dark:border-slate-600">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">+{order.items.length - 3} more items</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Material Design Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t-2 border-slate-100 dark:border-slate-700">
                <Link href={`/app/orders/${order.id}`} className="flex-1">
                  <Button className="w-full h-11 bg-indigo-500 hover:bg-indigo-600 text-white shadow-md hover:shadow-lg transition-all duration-200 rounded-lg font-medium">
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </Link>
                
                {['RECEIVED', 'PROCESSING'].includes(order.status) && (
                  <Button
                    onClick={() => handleCancelOrder(order.id)}
                    disabled={cancelOrderMutation.isPending}
                    className="flex-1 sm:flex-initial h-11 bg-white hover:bg-red-50 text-red-600 border-2 border-red-200 hover:border-red-300 dark:bg-slate-900 dark:hover:bg-red-900/20 dark:border-red-800 rounded-lg font-medium transition-all duration-200"
                  >
                    {cancelOrderMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      'Cancel Order'
                    )}
                  </Button>
                )}
                
                {order.status === 'DELIVERED' && (
                  <Button className="flex-1 sm:flex-initial h-11 bg-emerald-500 hover:bg-emerald-600 text-white shadow-md hover:shadow-lg transition-all duration-200 rounded-lg font-medium">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reorder Items
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <p className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.pages} ({pagination.total} orders)
            </p>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.hasPrev}
              >
                Previous
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.hasNext}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
