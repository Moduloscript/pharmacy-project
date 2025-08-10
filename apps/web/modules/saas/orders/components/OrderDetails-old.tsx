'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
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
  const { toast } = useToast()
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
      return data.data
    }
  })

  // Mutations
  const updateOrder = useUpdateOrder();
  const cancelOrder = useCancelOrder();
  const addTrackingUpdate = useAddTrackingUpdate();
  const verifyPrescription = useVerifyPrescription();
  const generateInvoice = useGenerateInvoice();
  const sendConfirmation = useSendOrderConfirmation();

  // Local state for forms
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus>('pending');
  const [newPaymentStatus, setNewPaymentStatus] = useState<PaymentStatus>('pending');
  const [adminNotes, setAdminNotes] = useState('');
  
  // Tracking form state
  const [showTrackingForm, setShowTrackingForm] = useState(false);
  const [trackingDescription, setTrackingDescription] = useState('');
  const [trackingLocation, setTrackingLocation] = useState('');

  // Initialize form values when order loads
  useEffect(() => {
    if (order) {
      setNewStatus(order.status);
      setNewPaymentStatus(order.paymentInfo.status);
      setAdminNotes(order.adminNotes || '');
    }
  }, [order]);

  const handleUpdateOrder = () => {
    if (!order) return;

    const updates: any = {};
    if (newStatus !== order.status) updates.status = newStatus;
    if (newPaymentStatus !== order.paymentInfo.status) updates.paymentStatus = newPaymentStatus;
    if (adminNotes !== (order.adminNotes || '')) updates.adminNotes = adminNotes;

    updateOrder.mutate(
      { orderId, updates },
      {
        onSuccess: () => {
          setIsEditingStatus(false);
        },
        onError: (error) => {
          alert('Failed to update order: ' + error.message);
        }
      }
    );
  };

  const handleAddTracking = () => {
    if (!trackingDescription.trim()) return;

    addTrackingUpdate.mutate(
      {
        orderId,
        status: newStatus,
        description: trackingDescription,
        location: trackingLocation || undefined
      },
      {
        onSuccess: () => {
          setShowTrackingForm(false);
          setTrackingDescription('');
          setTrackingLocation('');
        },
        onError: (error) => {
          alert('Failed to add tracking update: ' + error.message);
        }
      }
    );
  };

  const handleCancelOrder = () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    cancelOrder.mutate(
      { orderId, reason: 'Cancelled by admin' },
      {
        onError: (error) => {
          alert('Failed to cancel order: ' + error.message);
        }
      }
    );
  };

  const handleDownloadInvoice = () => {
    generateInvoice.mutate(orderId);
  };

  const handleSendConfirmation = () => {
    sendConfirmation.mutate(orderId, {
      onSuccess: () => {
        alert('Confirmation email sent successfully');
      },
      onError: (error) => {
        alert('Failed to send confirmation email: ' + error.message);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCwIcon className="size-8 text-gray-400 animate-spin" />
        <span className="ml-3 text-gray-600">Loading order details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 bg-red-50 border-red-200">
        <p className="text-red-800">{error.message}</p>
        <Button variant="outline" onClick={() => refetch()} className="mt-3">
          Try Again
        </Button>
      </Card>
    );
  }

  if (!order) {
    return (
      <Card className="p-6">
        <p className="text-gray-600">Order not found</p>
        <Link href="/app/orders">
          <Button variant="outline" className="mt-3">
            Back to Orders
          </Button>
        </Link>
      </Card>
    );
  }

  const canCancel = OrderUtils.canBeCancelled(order);
  const canRefund = OrderUtils.canBeRefunded(order);
  const estimatedDelivery = OrderUtils.getEstimatedDelivery(order);
  const statusProgression = OrderUtils.getStatusProgression(order.status);

  const isUpdating = updateOrder.isPending || addTrackingUpdate.isPending || cancelOrder.isPending;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/app/orders">
            <Button variant="ghost" size="sm">
              <ArrowLeftIcon className="size-4 mr-2" />
              Back to Orders
            </Button>
          </Link>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <PackageIcon className="size-8 mr-3" />
              {order.orderNumber}
            </h1>
            <p className="text-gray-600 mt-1">
              Placed on {format(order.createdAt, 'MMMM d, yyyy h:mm a')}
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

      {/* Order Status Progress */}
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Order Progress</h3>
        <div className="flex items-center justify-between">
          {statusProgression.map((step, index) => (
            <div key={step.status} className="flex items-center">
              <div className={cn(
                'flex items-center justify-center size-10 rounded-full border-2 transition-colors',
                step.completed 
                  ? 'border-green-600 bg-green-600 text-white'
                  : 'border-gray-300 bg-white text-gray-400'
              )}>
                {step.completed ? (
                  <CheckCircleIcon className="size-5" />
                ) : (
                  <div className="size-2 bg-gray-400 rounded-full"></div>
                )}
              </div>
              <span className={cn(
                'ml-3 font-medium capitalize',
                step.completed ? 'text-gray-900' : 'text-gray-400'
              )}>
                {step.status}
              </span>
              {index < statusProgression.length - 1 && (
                <div className={cn(
                  'w-16 h-0.5 mx-4',
                  step.completed ? 'bg-green-600' : 'bg-gray-300'
                )} />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Order Items</h3>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <img
                    src={item.image || '/placeholder-product.jpg'}
                    alt={item.name}
                    className="size-16 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                    <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                    <p className="text-sm text-gray-600 capitalize">Category: {item.category}</p>
                    {item.requiresPrescription && (
                      <Badge className="bg-yellow-100 text-yellow-800 text-xs mt-1">
                        Prescription Required
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {item.quantity} × {OrderUtils.formatPrice(item.unitPrice)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {OrderUtils.formatPrice(item.totalPrice)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Order Tracking */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Order Tracking</h3>
              {showAdminControls && (
                <Button size="sm" onClick={() => setShowTrackingForm(true)}>
                  <PlusIcon className="size-4 mr-2" />
                  Add Update
                </Button>
              )}
            </div>

            {showTrackingForm && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="trackingDescription">Description *</Label>
                    <Input
                      id="trackingDescription"
                      value={trackingDescription}
                      onChange={(e) => setTrackingDescription(e.target.value)}
                      placeholder="Package shipped from warehouse..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="trackingLocation">Location</Label>
                    <Input
                      id="trackingLocation"
                      value={trackingLocation}
                      onChange={(e) => setTrackingLocation(e.target.value)}
                      placeholder="Benin City, Nigeria"
                    />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleAddTracking} disabled={isUpdating}>
                    {addTrackingUpdate.isPending ? (
                      <>
                        <RefreshCwIcon className="size-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Update'
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setShowTrackingForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {order.tracking.length === 0 ? (
                <p className="text-gray-600 text-center py-4">No tracking updates yet</p>
              ) : (
                order.tracking.map((tracking, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className={cn(
                      'size-3 rounded-full mt-2',
                      index === order.tracking.length - 1 ? 'bg-blue-600' : 'bg-gray-300'
                    )}></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">{tracking.description}</h4>
                        <Badge className={OrderUtils.getStatusColor(tracking.status)}>
                          {tracking.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {format(tracking.updatedAt, 'MMMM d, yyyy h:mm a')}
                        {tracking.location && ` • ${tracking.location}`}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Prescription Files */}
          {order.prescriptionRequired && (
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Prescription Files</h3>
              {order.prescriptionFiles.length === 0 ? (
                <div className="text-center py-8">
                  <FileTextIcon className="size-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No prescriptions uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {order.prescriptionFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileTextIcon className="size-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-gray-900">{file.fileName}</p>
                          <p className="text-sm text-gray-600">
                            Uploaded {format(file.uploadedAt, 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {file.verified ? (
                          <Badge className="bg-green-100 text-green-800">Verified</Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                        )}
                        <Button size="sm" variant="outline">
                          <EyeIcon className="size-4" />
                        </Button>
                        {showAdminControls && !file.verified && (
                          <Button
                            size="sm"
                            onClick={() => verifyPrescription.mutate({
                              orderId,
                              prescriptionId: file.id,
                              verified: true
                            })}
                            disabled={verifyPrescription.isPending}
                          >
                            Verify
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Customer Information */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <UserIcon className="size-5 mr-2" />
              Customer Information
            </h3>
            <div className="space-y-3">
              <div>
                <p className="font-medium text-gray-900">{order.customerName}</p>
                <p className="text-sm text-gray-600">{order.customerEmail}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700 text-sm mb-1">Shipping Address:</p>
                <p className="text-sm text-gray-600">
                  {order.shippingAddress.firstName} {order.shippingAddress.lastName}<br />
                  {order.shippingAddress.address}<br />
                  {order.shippingAddress.city}, {order.shippingAddress.state}<br />
                  {order.shippingAddress.phone}
                </p>
              </div>
              {order.shippingAddress.instructions && (
                <div>
                  <p className="font-medium text-gray-700 text-sm mb-1">Delivery Instructions:</p>
                  <p className="text-sm text-gray-600">{order.shippingAddress.instructions}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Payment Information */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <CreditCardIcon className="size-5 mr-2" />
              Payment Information
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Method:</span>
                <span className="font-medium capitalize">{order.paymentInfo.method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <Badge className={OrderUtils.getPaymentStatusColor(order.paymentInfo.status)}>
                  {order.paymentInfo.status}
                </Badge>
              </div>
              {order.paymentInfo.transactionId && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction ID:</span>
                  <span className="font-mono text-sm">{order.paymentInfo.transactionId}</span>
                </div>
              )}
              {order.paymentInfo.paidAt && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Paid At:</span>
                  <span className="text-sm">{format(order.paymentInfo.paidAt, 'MMM d, yyyy')}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Order Summary */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span>{OrderUtils.formatPrice(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-{OrderUtils.formatPrice(order.discount)}</span>
                </div>
              )}
              {order.couponDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Coupon ({order.couponCode}):</span>
                  <span>-{OrderUtils.formatPrice(order.couponDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery:</span>
                <span>{OrderUtils.formatPrice(order.deliveryFee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax:</span>
                <span>{OrderUtils.formatPrice(order.tax)}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                <span>Total:</span>
                <span>{OrderUtils.formatPrice(order.grandTotal)}</span>
              </div>
            </div>
          </Card>

          {/* Delivery Information */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <TruckIcon className="size-5 mr-2" />
              Delivery Information
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Method:</span>
                <span className="font-medium capitalize">{order.deliveryMethod}</span>
              </div>
              {estimatedDelivery && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Estimated:</span>
                  <span className="text-sm">{format(estimatedDelivery, 'MMM d, yyyy')}</span>
                </div>
              )}
              {order.actualDelivery && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivered:</span>
                  <span className="text-sm text-green-600 font-medium">
                    {format(order.actualDelivery, 'MMM d, yyyy')}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Actions */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Actions</h3>
            <div className="space-y-3">
              <Button 
                onClick={handleDownloadInvoice} 
                className="w-full" 
                variant="outline"
                disabled={generateInvoice.isPending}
              >
                <DownloadIcon className="size-4 mr-2" />
                {generateInvoice.isPending ? 'Generating...' : 'Download Invoice'}
              </Button>

              {showAdminControls && (
                <>
                  <Button 
                    onClick={() => setIsEditingStatus(true)}
                    className="w-full" 
                    variant="outline"
                  >
                    <EditIcon className="size-4 mr-2" />
                    Update Status
                  </Button>

                  <Button 
                    onClick={handleSendConfirmation} 
                    className="w-full" 
                    variant="outline"
                    disabled={sendConfirmation.isPending}
                  >
                    {sendConfirmation.isPending ? 'Sending...' : 'Send Confirmation'}
                  </Button>

                  {canCancel && (
                    <Button
                      onClick={handleCancelOrder}
                      className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                      variant="outline"
                      disabled={cancelOrder.isPending}
                    >
                      <XCircleIcon className="size-4 mr-2" />
                      {cancelOrder.isPending ? 'Cancelling...' : 'Cancel Order'}
                    </Button>
                  )}
                </>
              )}
            </div>
          </Card>

          {/* Admin Controls */}
          {showAdminControls && isEditingStatus && (
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Update Order</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="orderStatus">Order Status</Label>
                  <Select value={newStatus} onValueChange={(value) => setNewStatus(value as OrderStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
                        <SelectItem key={status} value={status}>
                          <span className="capitalize">{status}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="paymentStatus">Payment Status</Label>
                  <Select value={newPaymentStatus} onValueChange={(value) => setNewPaymentStatus(value as PaymentStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['pending', 'paid', 'failed', 'refunded', 'partial'].map((status) => (
                        <SelectItem key={status} value={status}>
                          <span className="capitalize">{status}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="adminNotes">Admin Notes</Label>
                  <Textarea
                    id="adminNotes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Internal notes about this order..."
                    rows={3}
                  />
                </div>

                <div className="flex space-x-2">
                  <Button onClick={handleUpdateOrder} disabled={isUpdating} className="flex-1">
                    {updateOrder.isPending ? (
                      <>
                        <RefreshCwIcon className="size-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditingStatus(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
