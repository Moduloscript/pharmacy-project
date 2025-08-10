'use client';

import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { Badge } from '@ui/components/badge';
import { cn } from '@ui/lib';
import {
  CalendarIcon,
  PackageIcon,
  UserIcon,
  CreditCardIcon,
  TruckIcon,
  MapPinIcon,
  FileTextIcon,
  EyeIcon,
  DownloadIcon,
  XCircleIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ClockIcon
} from 'lucide-react';
import { Order } from '../lib/types';
import { OrderUtils } from '../lib/api';
import { useGenerateInvoice, useCancelOrder } from '../lib/queries';
import { format } from 'date-fns';
import Link from 'next/link';

interface OrderCardProps {
  order: Order;
  onOrderUpdate?: (updatedOrder: Order) => void;
  showCustomerInfo?: boolean;
  compact?: boolean;
  className?: string;
}

export function OrderCard({ 
  order, 
  onOrderUpdate, 
  showCustomerInfo = false, 
  compact = false,
  className 
}: OrderCardProps) {
  // Use TanStack Query for invoice generation
  const generateInvoice = useGenerateInvoice();
  
  // Use TanStack Query for order cancellation
  const cancelOrder = useCancelOrder();

  const handleDownloadInvoice = () => {
    generateInvoice.mutate(order.id);
  };

  const handleCancelOrder = () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    cancelOrder.mutate(
      { orderId: order.id, reason: 'Customer requested cancellation' }, 
      {
        onSuccess: (updatedOrder) => {
          if (onOrderUpdate) {
            onOrderUpdate(updatedOrder);
          }
        },
        onError: (error) => {
          console.error('Failed to cancel order:', error);
          alert('Failed to cancel order');
        }
      }
    );
  };

  const canCancel = OrderUtils.canBeCancelled(order);
  const canRefund = OrderUtils.canBeRefunded(order);
  const estimatedDelivery = OrderUtils.getEstimatedDelivery(order);

  const getDeliveryIcon = () => {
    switch (order.deliveryMethod) {
      case 'express':
        return <TruckIcon className="size-4 text-orange-600" />;
      case 'pickup':
        return <MapPinIcon className="size-4 text-green-600" />;
      default:
        return <TruckIcon className="size-4 text-blue-600" />;
    }
  };

  const getPaymentIcon = () => {
    switch (order.paymentInfo.method) {
      case 'card':
        return <CreditCardIcon className="size-4 text-blue-600" />;
      case 'transfer':
        return <RefreshCwIcon className="size-4 text-green-600" />;
      case 'cash':
        return <TruckIcon className="size-4 text-orange-600" />;
      default:
        return <CreditCardIcon className="size-4 text-gray-600" />;
    }
  };

  if (compact) {
    return (
      <Card className={cn('p-4', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <PackageIcon className="size-5 text-gray-400" />
            <div>
              <Link href={`/app/orders/${order.id}`} className="font-medium text-blue-600 hover:underline">
                {order.orderNumber}
              </Link>
              <p className="text-sm text-gray-600">
                {order.itemsCount} items • {OrderUtils.formatPrice(order.grandTotal)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge className={OrderUtils.getStatusColor(order.status)}>
              {order.status}
            </Badge>
            <span className="text-sm text-gray-500">
              {format(order.createdAt, 'MMM d')}
            </span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <PackageIcon className="size-6 text-gray-400" />
          <div>
            <Link href={`/app/orders/${order.id}`} className="font-semibold text-lg text-blue-600 hover:underline">
              {order.orderNumber}
            </Link>
            <p className="text-sm text-gray-600">
              Placed on {format(order.createdAt, 'MMMM d, yyyy')}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge className={OrderUtils.getStatusColor(order.status)}>
            {order.status}
          </Badge>
          <Badge className={OrderUtils.getPaymentStatusColor(order.paymentInfo.status)}>
            {order.paymentInfo.status}
          </Badge>
        </div>
      </div>

      {/* Customer Info */}
      {showCustomerInfo && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2 mb-1">
            <UserIcon className="size-4 text-gray-600" />
            <span className="font-medium text-gray-900">{order.customerName}</span>
          </div>
          <p className="text-sm text-gray-600">{order.customerEmail}</p>
          <p className="text-sm text-gray-600">{order.shippingAddress.phone}</p>
        </div>
      )}

      {/* Order Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <p className="text-2xl font-bold text-blue-900">{order.itemsCount}</p>
          <p className="text-sm text-blue-700">Items</p>
        </div>

        <div className="text-center p-3 bg-green-50 rounded-lg">
          <p className="text-2xl font-bold text-green-900">{OrderUtils.formatPrice(order.grandTotal)}</p>
          <p className="text-sm text-green-700">Total</p>
        </div>

        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <div className="flex items-center justify-center mb-1">
            {getDeliveryIcon()}
          </div>
          <p className="text-sm text-orange-700 capitalize">{order.deliveryMethod}</p>
        </div>

        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="flex items-center justify-center mb-1">
            {getPaymentIcon()}
          </div>
          <p className="text-sm text-purple-700 capitalize">{order.paymentInfo.method}</p>
        </div>
      </div>

      {/* Prescription Alert */}
      {order.prescriptionRequired && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <FileTextIcon className="size-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-900">Prescription Required</p>
              <p className="text-sm text-yellow-700 mt-1">
                {order.prescriptionVerified ? (
                  <span className="flex items-center">
                    <CheckCircleIcon className="size-4 text-green-600 mr-1" />
                    Prescription verified
                  </span>
                ) : (
                  <span className="flex items-center">
                    <AlertTriangleIcon className="size-4 text-yellow-600 mr-1" />
                    Awaiting prescription verification
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Information */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center">
              <MapPinIcon className="size-4 mr-2" />
              Delivery Address
            </h4>
            <p className="text-sm text-gray-700">
              {order.shippingAddress.firstName} {order.shippingAddress.lastName}
            </p>
            <p className="text-sm text-gray-700">{order.shippingAddress.address}</p>
            <p className="text-sm text-gray-700">
              {order.shippingAddress.city}, {order.shippingAddress.state}
            </p>
          </div>

          {estimatedDelivery && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                <ClockIcon className="size-4 mr-2" />
                Estimated Delivery
              </h4>
              <p className="text-sm text-gray-700">
                {format(estimatedDelivery, 'MMMM d, yyyy')}
              </p>
              {order.actualDelivery && (
                <p className="text-sm text-green-600 font-medium">
                  Delivered on {format(order.actualDelivery, 'MMMM d, yyyy')}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent Tracking */}
      {order.tracking.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2">Latest Update</h4>
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="size-2 bg-blue-600 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">
                  {order.tracking[order.tracking.length - 1].description}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  {format(order.tracking[order.tracking.length - 1].updatedAt, 'MMM d, yyyy h:mm a')}
                  {order.tracking[order.tracking.length - 1].location && (
                    <span> • {order.tracking[order.tracking.length - 1].location}</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 pt-4 border-t">
        <Link href={`/app/orders/${order.id}`}>
          <Button variant="outline" size="sm">
            <EyeIcon className="size-4 mr-2" />
            View Details
          </Button>
        </Link>

        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadInvoice}
          disabled={generateInvoice.isPending}
        >
          <DownloadIcon className="size-4 mr-2" />
          Invoice
        </Button>

        {canCancel && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancelOrder}
            disabled={cancelOrder.isPending}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <XCircleIcon className="size-4 mr-2" />
            Cancel
          </Button>
        )}

        {canRefund && (
          <Button
            variant="outline"
            size="sm"
            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
          >
            <RefreshCwIcon className="size-4 mr-2" />
            Request Refund
          </Button>
        )}

        <div className="ml-auto text-sm text-gray-500">
          Updated {format(order.updatedAt, 'MMM d, h:mm a')}
        </div>
      </div>
    </Card>
  );
}
