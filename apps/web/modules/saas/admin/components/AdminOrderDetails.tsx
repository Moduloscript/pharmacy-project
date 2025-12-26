"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/components/card'
import { Badge } from '@ui/components/badge'
import { Separator } from '@ui/components/separator'
import { Textarea } from '@ui/components/textarea'
import {
  Loader2,
  ArrowLeft,
  Package,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Eye,
  Download,
  MessageSquare,
} from 'lucide-react'
import { formatNaira } from '@/lib/nigerian-locations'

// Admin status options
const ADMIN_STATUS_OPTIONS = ['RECEIVED','PROCESSING','READY','DISPATCHED','DELIVERED','CANCELLED'] as const

type AdminStatus = typeof ADMIN_STATUS_OPTIONS[number]

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

interface AdminOrderDetailsProps {
  orderId: string
}

export function AdminOrderDetails({ orderId }: AdminOrderDetailsProps) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: order, isLoading, error, refetch } = useQuery({
    queryKey: ['admin','order', orderId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/orders/${orderId}`)
      if (!res.ok) throw new Error('Failed to fetch order')
      const data = await res.json()
      // Normalize
      const orderData: any = data
      if (orderData.orderItems && !orderData.items) orderData.items = orderData.orderItems
      return orderData
    }
  })

  const updateStatus = useMutation({
    mutationFn: async (status: AdminStatus) => {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      if (!res.ok) throw new Error('Failed to update status')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Order status updated')
      queryClient.invalidateQueries({ queryKey: ['admin','order', orderId] })
      queryClient.invalidateQueries({ queryKey: ['admin','orders'] })
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update status')
  })

  const updateNotes = useMutation({
    mutationFn: async (notes: string) => {
      const res = await fetch(`/api/admin/orders/${orderId}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internalNotes: notes })
      })
      if (!res.ok) throw new Error('Failed to update notes')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Notes saved')
      queryClient.invalidateQueries({ queryKey: ['admin','order', orderId] })
    },
    onError: (err: any) => toast.error(err.message || 'Failed to save notes')
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-red-500">Failed to load order</p>
          <Button onClick={() => refetch()} className="mt-4">Retry</Button>
        </CardContent>
      </Card>
    )
  }

  const items = order.items || []

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-4 flex items-center gap-4">
        <Link href="/app/admin/orders">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Orders
          </Button>
        </Link>
        <span className="inline-flex items-center gap-2 rounded-md border px-3 py-1 text-sm">
          {getStatusIcon(order.status)} {order.status}
        </span>
      </div>

      {/* Admin controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Admin Controls</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {ADMIN_STATUS_OPTIONS.map((s) => (
            <Button
              key={s}
              variant={order.status === s ? 'default' : 'secondary'}
              onClick={() => updateStatus.mutate(s)}
              disabled={updateStatus.isPending || order.status === s}
            >
              Set {s}
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Order summary */}
      <div className="grid gap-10 lg:grid-cols-2 items-stretch mb-10">
        {/* Customer Information */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Business Name</label>
              <p className="font-medium">{order.customer?.businessName || order.customer?.user?.name || order.customer?.contactName || 'N/A'}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Contact Name</label>
              <p className="font-medium">{order.customer?.user?.name || order.customer?.contactName || 'N/A'}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Email Address</label>
              <p className="font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {order.customer?.user?.email || order.customer?.email || 'N/A'}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Phone Number</label>
              <p className="font-medium flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {order.customer?.phone || 'N/A'}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Customer Type</label>
              <Badge variant="secondary">{order.customer?.customerType || 'RETAIL'}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Information */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Delivery Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Delivery Method</label>
              <p className="font-medium capitalize">{order.deliveryMethod?.toLowerCase() || 'standard'}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Delivery Address</label>
              <div className="space-y-1">
                <p className="font-medium flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5" />
                  <span>
                    {order.deliveryAddress}<br/>
                    {order.deliveryCity}, {order.deliveryState}
                    {order.deliveryLGA && <><br/>{order.deliveryLGA}</>}
                  </span>
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Contact Phone</label>
              <p className="font-medium flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {order.deliveryPhone || order.customer?.phone || 'N/A'}
              </p>
            </div>
            {order.estimatedDelivery && (
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Estimated Delivery</label>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(order.estimatedDelivery).toLocaleDateString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Prescription Section (if applicable) */}
      {(order.prescriptions?.length > 0 || order.requiresPrescription) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Prescription Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            {order.prescriptions?.length > 0 ? (
              <div className="space-y-3">
                {order.prescriptions.map((rx: any) => (
                  <div key={rx.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={rx.status === 'APPROVED' ? 'default' : rx.status === 'REJECTED' ? 'destructive' : 'secondary'}>
                          {rx.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">ID: {rx.id.slice(0, 8)}</span>
                      </div>
                      {rx.reviewedBy && (
                        <p className="text-sm text-muted-foreground">
                          Reviewed by {rx.reviewedBy} on {new Date(rx.reviewedAt).toLocaleDateString()}
                        </p>
                      )}
                      {rx.rejectionReason && (
                        <p className="text-sm text-red-600">Reason: {rx.rejectionReason}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                      {rx.imageUrl && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={rx.imageUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4 mr-1" /> Download
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No prescription uploaded yet</p>
                <p className="text-sm mt-1">Customer needs to upload prescription for controlled items</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Payment & Order Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm text-muted-foreground">Order Number</label>
              <p className="font-medium">{order.orderNumber}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Order Date</label>
              <p className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Last Updated</label>
              <p className="font-medium">{new Date(order.updatedAt).toLocaleDateString()}</p>
            </div>
          </div>
          
          <Separator />
          
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm text-muted-foreground">Payment Status</label>
              <Badge variant={order.paymentStatus === 'COMPLETED' ? 'default' : 'secondary'}>
                {order.paymentStatus}
              </Badge>
            </div>
            {order.paymentMethod && (
              <div>
                <label className="text-sm text-muted-foreground">Payment Method</label>
                <p className="font-medium">{order.paymentMethod}</p>
              </div>
            )}
            {order.paymentReference && (
              <div>
                <label className="text-sm text-muted-foreground">Payment Reference</label>
                <p className="font-mono text-sm bg-muted px-2 py-1 rounded">{order.paymentReference}</p>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="font-semibold">Items</h4>
            <div className="space-y-2">
              {items.map((it: any) => (
                <div key={it.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="font-medium">{it.product?.name || it.productName}</div>
                    <div className="text-xs text-muted-foreground">Qty: {it.quantity}</div>
                  </div>
                  <div className="text-right">
                    <div>{formatNaira(Number(it.unitPrice))} × {it.quantity}</div>
                    <div className="font-semibold">{formatNaira(Number(it.subtotal))}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-md bg-muted p-3">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatNaira(Number(order.subtotal))}</span></div>
              <div className="flex justify-between"><span>Delivery</span><span>{formatNaira(Number(order.deliveryFee))}</span></div>
              {Number(order.discount) > 0 && (
                <div className="flex justify-between"><span>Discount</span><span>-{formatNaira(Number(order.discount))}</span></div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold"><span>Total</span><span>{formatNaira(Number(order.total))}</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Tracking Timeline */}
      {order.tracking?.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Order Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-6 bottom-0 w-0.5 bg-muted" />
              
              <div className="space-y-6">
                {order.tracking.map((track: any, index: number) => (
                  <div key={track.id} className="flex items-start gap-4">
                    <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background border-2 border-muted">
                      {getStatusIcon(track.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium capitalize">{track.status.toLowerCase()}</h4>
                        <time className="text-sm text-muted-foreground">
                          {new Date(track.timestamp).toLocaleString()}
                        </time>
                      </div>
                      {track.notes && (
                        <p className="text-sm text-muted-foreground">{track.notes}</p>
                      )}
                      {track.updatedBy && (
                        <p className="text-xs text-muted-foreground mt-1">By: {track.updatedBy}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Internal notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Internal Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={(formData) => {
            const notes = String(formData.get('notes') || '')
            updateNotes.mutate(notes)
          }} className="space-y-3">
            <Textarea 
              name="notes" 
              defaultValue={order.internalNotes || ''} 
              rows={5}
              placeholder="Add internal notes about this order. These notes are not visible to customers."
            />
            <Button type="submit" disabled={updateNotes.isPending}>
              {updateNotes.isPending ? 'Saving...' : 'Save Notes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

