'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@ui/components/card'
import { Button } from '@ui/components/button'
import { Badge } from '@ui/components/badge'
import { cn } from '@ui/lib'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CalendarIcon,
  PackageIcon,
  CreditCardIcon,
  TruckIcon,
  MapPinIcon,
  EyeIcon,
  XCircleIcon,
  RefreshCwIcon,
  ClockIcon,
  Loader2
} from 'lucide-react'
import { formatNaira } from '@/lib/nigerian-locations'
import Link from 'next/link'

// Material Design status colors
const getStatusColor = (status: string) => {
  switch (status) {
    case 'RECEIVED': 
      return 'bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800'
    case 'PROCESSING': 
      return 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
    case 'READY': 
      return 'bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
    case 'DISPATCHED': 
      return 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
    case 'DELIVERED': 
      return 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
    case 'CANCELLED': 
      return 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
    default: 
      return 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
  }
}

const getPaymentStatusColor = (status: string) => {
  switch (status) {
    case 'COMPLETED': 
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
    case 'PENDING': 
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
    default: 
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
  }
}

const getDeliveryMethodIcon = (method: string) => {
  switch (method.toLowerCase()) {
    case 'express':
      return <TruckIcon className="h-4 w-4 text-orange-500" />
    case 'pickup':
      return <MapPinIcon className="h-4 w-4 text-green-500" />
    default:
      return <TruckIcon className="h-4 w-4 text-blue-500" />
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

interface CollapsibleOrderCardProps {
  order: Order
  onCancelOrder?: (orderId: string) => void
  isLoading?: boolean
  className?: string
}

export function CollapsibleOrderCard({ 
  order, 
  onCancelOrder, 
  isLoading = false,
  className 
}: CollapsibleOrderCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggleExpanded()
    }
  }

  const handleCancelOrder = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onCancelOrder && window.confirm('Are you sure you want to cancel this order?')) {
      onCancelOrder(order.id)
    }
  }

  const canCancel = ['RECEIVED', 'PROCESSING'].includes(order.status)
  const itemCount = order.items?.length || 0

  return (
    <Card className={cn(
      'overflow-hidden shadow-md border-0 hover:shadow-lg transition-all duration-300 dark:bg-slate-800',
      className
    )}>
      {/* Collapsible Header - Always Visible */}
      <CardHeader 
        className={cn(
          'pb-3 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-800 cursor-pointer select-none hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-colors duration-200',
          isExpanded && 'border-b border-slate-100 dark:border-slate-700'
        )}
        onClick={toggleExpanded}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-expanded={isExpanded}
        aria-controls={`order-details-${order.id}`}
        aria-labelledby={`order-title-${order.id}`}
      >
        <div className="flex flex-col gap-4">
          {/* Mobile/Desktop Header Row */}
          <div className="flex items-center justify-between">
            {/* Left Side - Order Info */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="p-2 bg-white rounded-lg shadow-sm dark:bg-slate-900 flex-shrink-0">
                <PackageIcon className="h-5 w-5 text-indigo-500" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 
                  id={`order-title-${order.id}`}
                  className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate"
                >
                  Order #{order.orderNumber}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3 flex-shrink-0" />
                    <span className="text-xs">
                      {new Date(order.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Expand/Collapse Icon - Always Visible */}
            <div className="flex-shrink-0 ml-2">
              {isExpanded ? (
                <ChevronUpIcon className="h-5 w-5 text-slate-400 transition-transform duration-200" />
              ) : (
                <ChevronDownIcon className="h-5 w-5 text-slate-400 transition-transform duration-200" />
              )}
            </div>
          </div>

          {/* Second Row - Quick Info & Status */}
          <div className="flex items-center justify-between gap-3">
            {/* Left: Quick Info */}
            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1">
                <PackageIcon className="h-3 w-3" />
                <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="hidden sm:flex items-center gap-1">
                {getDeliveryMethodIcon(order.deliveryMethod)}
                <span className="capitalize">{order.deliveryMethod.toLowerCase()}</span>
              </div>
            </div>
            
            {/* Right: Status & Total */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(order.paymentStatus)}`}>
                    {order.paymentStatus}
                  </span>
                  <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                    {formatNaira(order.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Expandable Content */}
      <div 
        id={`order-details-${order.id}`}
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          isExpanded ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
        )}
        aria-hidden={!isExpanded}
      >
        <CardContent className="space-y-4 p-6 pt-0">
          {/* Delivery Details */}
          {order.deliveryMethod !== 'PICKUP' && (
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg dark:bg-slate-900">
              <div className="p-2 bg-white rounded-lg shadow-sm dark:bg-slate-800">
                <MapPinIcon className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-1">Delivery Address</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {order.deliveryAddress}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {order.deliveryCity}, {order.deliveryState}
                </p>
                {order.estimatedDelivery && (
                  <div className="flex items-center gap-1 mt-2 text-sm text-slate-500 dark:text-slate-400">
                    <ClockIcon className="h-3 w-3" />
                    Est. delivery: {new Date(order.estimatedDelivery).toLocaleDateString('en-GB')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Items Preview */}
          <div>
            <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3">Order Items</h4>
            <div className="space-y-2">
              {order.items.slice(0, 3).map((item: OrderItem) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {item.product.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold dark:bg-indigo-900/30 dark:text-indigo-300">
                      x{item.quantity}
                    </span>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {formatNaira(item.subtotal)}
                    </span>
                  </div>
                </div>
              ))}
              {order.items.length > 3 && (
                <div className="p-3 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg text-center border border-dashed border-slate-300 dark:border-slate-600">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    +{order.items.length - 3} more items
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Latest Tracking Update */}
          {order.tracking.length > 0 && (
            <div className="p-4 bg-slate-50 rounded-lg dark:bg-slate-900">
              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Latest Update</h4>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {order.tracking[order.tracking.length - 1].notes || order.status}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {new Date(order.tracking[order.tracking.length - 1].timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
            <Link href={`/app/orders/${order.id}`} className="flex-1">
              <Button className="w-full h-11 bg-indigo-500 hover:bg-indigo-600 text-white shadow-md hover:shadow-lg transition-all duration-200 rounded-lg font-medium">
                <EyeIcon className="h-4 w-4 mr-2" />
                View Details
              </Button>
            </Link>
            
            {canCancel && (
              <Button
                onClick={handleCancelOrder}
                disabled={isLoading}
                className="flex-1 sm:flex-initial h-11 bg-white hover:bg-red-50 text-red-600 border-2 border-red-200 hover:border-red-300 dark:bg-slate-900 dark:hover:bg-red-900/20 dark:border-red-800 rounded-lg font-medium transition-all duration-200"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <XCircleIcon className="h-4 w-4 mr-2" />
                    Cancel Order
                  </>
                )}
              </Button>
            )}
            
            {order.status === 'DELIVERED' && (
              <Button className="flex-1 sm:flex-initial h-11 bg-emerald-500 hover:bg-emerald-600 text-white shadow-md hover:shadow-lg transition-all duration-200 rounded-lg font-medium">
                <RefreshCwIcon className="h-4 w-4 mr-2" />
                Reorder
              </Button>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  )
}
