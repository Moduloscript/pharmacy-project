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
      <Card className={cn('p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 bg-white rounded-lg dark:bg-slate-900 dark:border-slate-800', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-slate-100 rounded-lg dark:bg-slate-800">
              <PackageIcon className="size-5 text-slate-700 dark:text-slate-300" strokeWidth={1.5} />
            </div>
            <div>
              <Link href={`/app/orders/${order.id}`} className="font-semibold text-lg text-slate-900 hover:text-slate-700 transition-colors duration-200 dark:text-slate-100 dark:hover:text-slate-300">
                {order.orderNumber}
              </Link>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {order.itemsCount || order.items?.length || 0} items • {OrderUtils.formatPrice(order.grandTotal)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-slate-700 bg-slate-100 px-3 py-1 rounded-md dark:text-slate-300 dark:bg-slate-800">
              {order.status}
            </span>
            <div className="text-right">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {format(order.createdAt, 'MMM d')}
              </span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 bg-white rounded-lg overflow-hidden dark:bg-slate-900 dark:border-slate-800', className)}>
      {/* Simple Header */}
      <div className="bg-slate-50 p-6 border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white rounded-lg border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
              <PackageIcon className="size-6 text-slate-700 dark:text-slate-300" strokeWidth={1.5} />
            </div>
            <div>
              <Link href={`/app/orders/${order.id}`} className="font-bold text-xl text-slate-900 hover:text-slate-700 transition-colors duration-200 dark:text-slate-100 dark:hover:text-slate-300">
                {order.orderNumber}
              </Link>
              <p className="text-sm text-slate-600 mt-1 dark:text-slate-400">
                Placed on {format(order.createdAt, 'MMMM d, yyyy')}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end space-y-2">
            <span className="text-sm font-medium text-slate-700 bg-white px-4 py-2 rounded-md border border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300">
              {order.status}
            </span>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Payment: {order.paymentInfo.status}
            </span>
          </div>
        </div>
      </div>
      
      <div className="p-6">

      {/* Customer Info */}
      {showCustomerInfo && (
        <div className="mb-4 p-3 bg-slate-50 rounded-lg dark:bg-slate-800/60 dark:border-slate-700 border border-slate-200/60">
          <div className="flex items-center space-x-2 mb-1">
            <UserIcon className="size-4 text-slate-600 dark:text-slate-300" />
            <span className="font-medium text-slate-900 dark:text-slate-100">{order.customerName}</span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">{order.customerEmail}</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">{order.shippingAddress.phone}</p>
        </div>
      )}

        {/* Simple Order Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
            <p className="text-2xl font-bold text-slate-900 mb-1 dark:text-slate-100">{order.itemsCount || order.items?.length || 0}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Items</p>
          </div>

          <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
            <p className="text-xl font-bold text-slate-900 mb-1 dark:text-slate-100">{OrderUtils.formatPrice(order.grandTotal)}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Total</p>
          </div>

          <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
            <TruckIcon className="size-5 mx-auto mb-2 text-slate-600 dark:text-slate-400" />
            <p className="text-sm text-slate-600 capitalize dark:text-slate-400">{order.deliveryMethod}</p>
          </div>

          <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
            <CreditCardIcon className="size-5 mx-auto mb-2 text-slate-600 dark:text-slate-400" />
            <p className="text-sm text-slate-600 capitalize dark:text-slate-400">{order.paymentInfo.method}</p>
          </div>
        </div>

      {/* Prescription Alert */}
      {order.prescriptionRequired && (
        <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg dark:bg-slate-800 dark:border-slate-700">
          <div className="flex items-start space-x-3">
            <FileTextIcon className="size-5 text-slate-600 mt-0.5 dark:text-slate-400" />
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">Prescription Required</p>
              <p className="text-sm text-slate-600 mt-1 dark:text-slate-400">
                {order.prescriptionVerified ? (
                  <span className="flex items-center">
                    <CheckCircleIcon className="size-4 text-slate-600 mr-1 dark:text-slate-400" />
                    Prescription verified
                  </span>
                ) : (
                  <span className="flex items-center">
                    <AlertTriangleIcon className="size-4 text-slate-600 mr-1 dark:text-slate-400" />
                    Awaiting prescription verification
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Information */}
      <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200/60 dark:bg-slate-800/60 dark:border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-slate-900 mb-2 flex items-center dark:text-slate-100">
              <MapPinIcon className="size-4 mr-2 text-slate-600 dark:text-slate-300" />
              Delivery Address
            </h4>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {order.shippingAddress.firstName} {order.shippingAddress.lastName}
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{order.shippingAddress.address}</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {order.shippingAddress.city}, {order.shippingAddress.state}
            </p>
          </div>

          {estimatedDelivery && (
            <div>
              <h4 className="font-medium text-slate-900 mb-2 flex items-center dark:text-slate-100">
                <ClockIcon className="size-4 mr-2 text-slate-600 dark:text-slate-300" />
                Estimated Delivery
              </h4>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {format(estimatedDelivery, 'MMMM d, yyyy')}
              </p>
              {order.actualDelivery && (
                <p className="text-sm text-emerald-600 font-medium dark:text-emerald-400">
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
          <h4 className="font-medium text-slate-900 mb-2 dark:text-slate-100">Latest Update</h4>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
            <div className="flex items-start space-x-3">
              <div className="size-2 bg-slate-600 rounded-full mt-2 dark:bg-slate-400"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {order.tracking[order.tracking.length - 1].description}
                </p>
                <p className="text-xs text-slate-600 mt-1 dark:text-slate-400">
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
      <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
        <Link href={`/app/orders/${order.id}`}>
          <Button variant="outline" size="sm" className="hover:bg-slate-50 dark:hover:bg-slate-800">
            <EyeIcon className="size-4 mr-2" />
            View Details
          </Button>
        </Link>

        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadInvoice}
          disabled={generateInvoice.isPending}
          className="hover:bg-slate-50 dark:hover:bg-slate-800"
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
            className="hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <XCircleIcon className="size-4 mr-2" />
            Cancel
          </Button>
        )}

        {canRefund && (
          <Button
            variant="outline"
            size="sm"
            className="hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <RefreshCwIcon className="size-4 mr-2" />
            Request Refund
          </Button>
        )}

        <div className="ml-auto text-sm text-slate-500 dark:text-slate-400">
          Updated {format(order.updatedAt, 'MMM d, h:mm a')}
        </div>
      </div>
      </div>
    </Card>
  );
}
