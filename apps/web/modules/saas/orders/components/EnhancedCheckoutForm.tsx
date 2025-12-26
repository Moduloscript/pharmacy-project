'use client'

import { atom, useAtom, useAtomValue } from 'jotai'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@ui/components/button'
import { Card, CardHeader, CardTitle, CardContent } from '@ui/components/card'
import { Input } from '@ui/components/input'
import { Label } from '@ui/components/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/components/select'
import { Textarea } from '@ui/components/textarea'
import { Separator } from '@ui/components/separator'
import { Badge } from '@ui/components/badge'
import { RadioGroup, RadioGroupItem } from '@ui/components/radio-group'
import { useCartToast } from '@saas/shared/hooks/use-toast'
import { Loader2, CreditCard, Truck, Package, MapPin, Phone, User, Globe, CheckCircle, Upload } from 'lucide-react'
import { nigerianStates, getLGAs, formatNaira } from '@/lib/nigerian-locations'
import { 
  selectedStateAtom, 
  selectedLGAAtom, 
  deliveryAddressAtom, 
  phoneNumberAtom,
  cartItemsAtom,
  cartSummaryAtom,
  clearCartAtom,
  startCheckoutWithExpirationAtom,
  endCheckoutWithExpirationAtom,
  startPaymentWithExpirationAtom,
  type CartItem
} from '../../cart/lib/cart-store'
import { useState, useRef } from 'react'
import { CheckoutPrescriptionUpload, type CheckoutPrescriptionUploadRef, type CheckoutPrescriptionFile } from './CheckoutPrescriptionUpload'
import { uploadPrescriptionAfterOrder } from '../lib/prescription-upload-helpers'
import { useSession } from '../../auth/hooks/use-session'

// Enhanced atoms for Nigerian payment system integration
const enhancedCheckoutFormAtom = atom({
  deliveryMethod: 'STANDARD' as 'STANDARD' | 'EXPRESS' | 'PICKUP',
  paymentMethod: 'FLUTTERWAVE' as 'FLUTTERWAVE' | 'OPAY' | 'PAYSTACK' | 'DIRECT_ORDER',
  purchaseOrderNumber: '',
  useNigerianPayments: true // Auto-detect Nigerian payments
})

const checkoutLoadingAtom = atom(false)
const orderCompleteAtom = atom(false)
const paymentUrlAtom = atom<string | null>(null)

// Enhanced form schema
const enhancedCheckoutSchema = z.object({
  deliveryMethod: z.enum(['STANDARD', 'EXPRESS', 'PICKUP']),
  deliveryAddress: z.string().min(5, 'Address must be at least 5 characters'),
  deliveryCity: z.string().min(2, 'City is required'),
  deliveryState: z.string().min(2, 'State is required'),
  deliveryLGA: z.string().optional(),
  deliveryPhone: z.string().min(10, 'Valid phone number required'),
  deliveryNotes: z.string().optional(),
  paymentMethod: z.enum(['FLUTTERWAVE', 'OPAY', 'PAYSTACK', 'DIRECT_ORDER']),
  purchaseOrderNumber: z.string().optional(),
  customerName: z.string().min(2, 'Customer name is required'),
  customerEmail: z.string().email('Valid email is required')
}).refine((data) => {
  if (data.deliveryMethod !== 'PICKUP') {
    return data.deliveryAddress && data.deliveryCity && data.deliveryState && data.deliveryPhone
  }
  return true
}, {
  message: 'Delivery details are required for delivery orders'
}).refine((data) => {
  // Validate Nigerian phone number format
  if (data.deliveryPhone) {
    const phoneRegex = /^(\+234|234|0)[789]\d{9}$/
    return phoneRegex.test(data.deliveryPhone.replace(/[\s\-\(\)]/g, ''))
  }
  return true
}, {
  message: 'Please enter a valid Nigerian phone number (e.g., +234XXXXXXXXXX)'
})

type EnhancedCheckoutFormData = z.infer<typeof enhancedCheckoutSchema>

// Using CartItem from cart-store

interface EnhancedCheckoutFormProps {
  onSuccess?: (orderId: string) => void
  onCancel?: () => void
}

export function EnhancedCheckoutForm({ onSuccess, onCancel }: EnhancedCheckoutFormProps) {
  const cartToast = useCartToast()
  const { user } = useSession()
  const queryClient = useQueryClient()
  
  // Atoms
  const [checkoutForm, setCheckoutForm] = useAtom(enhancedCheckoutFormAtom)
  const [isLoading, setIsLoading] = useAtom(checkoutLoadingAtom)
  const [orderComplete, setOrderComplete] = useAtom(orderCompleteAtom)
  const [paymentUrl, setPaymentUrl] = useAtom(paymentUrlAtom)
  const [, clearCart] = useAtom(clearCartAtom)
  const [, startCheckoutWithExpiration] = useAtom(startCheckoutWithExpirationAtom)
  const [, endCheckoutWithExpiration] = useAtom(endCheckoutWithExpirationAtom)
  const [, startPaymentWithExpiration] = useAtom(startPaymentWithExpirationAtom)
  const selectedState = useAtomValue(selectedStateAtom)
  const selectedLGA = useAtomValue(selectedLGAAtom)
  const deliveryAddress = useAtomValue(deliveryAddressAtom)
  const phoneNumber = useAtomValue(phoneNumberAtom)
  
  // Auto-detect Nigerian payment system based on environment
  const isNigerianUser = process.env.NEXT_PUBLIC_CURRENCY === 'NGN' || 
                        process.env.NEXT_PUBLIC_CURRENCY_SYMBOL === '₦'
  
  // Form setup
  const form = useForm<EnhancedCheckoutFormData>({
    resolver: zodResolver(enhancedCheckoutSchema),
    defaultValues: {
      deliveryMethod: checkoutForm.deliveryMethod,
      deliveryAddress,
      deliveryCity: 'Benin City', // Default for BenPharm
      deliveryState: selectedState || 'Edo',
      deliveryLGA: selectedLGA,
      deliveryPhone: phoneNumber,
      deliveryNotes: '',
      paymentMethod: isNigerianUser ? checkoutForm.paymentMethod : 'DIRECT_ORDER',
      purchaseOrderNumber: checkoutForm.purchaseOrderNumber,
      customerName: '',
      customerEmail: ''
    }
  })
  
  // Get cart data from atoms
  const cartItems = useAtomValue(cartItemsAtom)
  const cartSummary = useAtomValue(cartSummaryAtom)
  
  // Format cart data to match expected structure
  const cartData = {
    data: {
      items: cartItems,
      summary: {
        subtotal: cartSummary.subtotal,
        itemCount: cartSummary.totalQuantity,
        bulkDiscount: cartSummary.bulkDiscount,
        deliveryFee: cartSummary.deliveryFee,
        total: cartSummary.total
      }
    }
  }
  const cartLoading = false // No loading state needed for atoms
  
  // Enhanced order creation that uses Nigerian payment system
  const createEnhancedOrderMutation = useMutation({
    mutationFn: async (orderData: EnhancedCheckoutFormData) => {
      const isUsingNigerianGateways = ['FLUTTERWAVE', 'OPAY', 'PAYSTACK'].includes(orderData.paymentMethod)
      
      if (isUsingNigerianGateways && isNigerianUser) {
        // Use enhanced Nigerian payment system
        return await createNigerianPayment(orderData)
      } else {
        // Use traditional direct order system
        return await createDirectOrder(orderData)
      }
    },
    onMutate: () => {
      setIsLoading(true)
    },
    onSuccess: async (data) => {
      setIsLoading(false)
      
      if (data.paymentUrl) {
        // Redirect to Nigerian payment gateway
        cartToast.showSuccess('Redirecting to Payment Gateway - You will be redirected to complete your payment.')
        
        setPaymentUrl(data.paymentUrl)
        
        // Redirect after short delay to show toast
        setTimeout(() => {
          window.location.href = data.paymentUrl!
        }, 2000)
      } else {
        // Direct order completed
        // If prescription files were selected and items require prescription, upload them
        try {
          if (requiresPrescription && prescriptionFiles.length > 0 && data.orderId) {
            const uploadResult = await uploadPrescriptionAfterOrder(data.orderId, prescriptionFiles, user?.id || '')
            
            if (uploadResult.success) {
              cartToast.showSuccess('Prescription uploaded successfully and linked to your order.')
            } else {
              cartToast.showError(`Order created, but prescription upload failed: ${uploadResult.error}. You can upload it from the order page.`)
            }
          }
        } catch (e) {
          // Non-blocking errors
          console.warn('Prescription upload step failed:', e)
          cartToast.showError('Order created, but failed to upload prescription. You can upload it from the order page.')
        }

        cartToast.showSuccess(`Order Created Successfully! Your order #${data.orderNumber} has been created.`)
        
        // Clear cart for direct orders (cash on delivery, invoice, etc.)
        clearCart('order_completed')
        
        setOrderComplete(true)
        
        // Clear cart and refresh
        queryClient.invalidateQueries({ queryKey: ['cart'] })
        queryClient.invalidateQueries({ queryKey: ['orders'] })
        
        // Callback with order ID
        if (onSuccess) {
          onSuccess(data.orderId)
        }
      }
    },
    onError: (error) => {
      setIsLoading(false)
      cartToast.showError(`Order Creation Failed: ${error.message}`)
    }
  })
  
  // Create Nigerian payment using enhanced system
  const createNigerianPayment = async (orderData: EnhancedCheckoutFormData) => {
    // 1) Create the order first via /api/orders
    const orderCreateResp = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cartData?.data?.items?.map((item: CartItem) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        })) || [],
        deliveryMethod: orderData.deliveryMethod,
        deliveryAddress: orderData.deliveryAddress,
        deliveryCity: 'Benin City',
        deliveryState: orderData.deliveryState,
        deliveryLGA: orderData.deliveryLGA,
        deliveryPhone: orderData.deliveryPhone,
        deliveryNotes: orderData.deliveryNotes,
        // Optional: include mapped gateway method
        paymentMethod: ['FLUTTERWAVE','OPAY','PAYSTACK'].includes(orderData.paymentMethod) ? orderData.paymentMethod as any : undefined,
        purchaseOrderNumber: orderData.purchaseOrderNumber
      })
    })

    if (!orderCreateResp.ok) {
      const err = await orderCreateResp.json().catch(() => ({}))
      throw new Error(err?.error?.message || 'Failed to create order before payment')
    }
    const orderResult = await orderCreateResp.json()
    const createdOrderId = orderResult?.data?.order?.id as string
    const createdOrderNumber = orderResult?.data?.order?.orderNumber as string
    const createdOrderTotal = Number(orderResult?.data?.order?.total || 0)

    // 2) If prescription is required and a file is selected, upload before payment
    try {
      if (requiresPrescription && prescriptionFiles.length > 0 && createdOrderId) {
        const uploadResult = await uploadPrescriptionAfterOrder(createdOrderId, prescriptionFiles, user?.id || '')
        
        if (!uploadResult.success) {
          cartToast.showError(`Order created, but prescription upload failed: ${uploadResult.error}. You can upload from the order page.`)
        }
      }
    } catch (e) {
      console.warn('Non-blocking prescription upload error before payment:', e)
    }

    // 3) Initialize Nigerian payment referencing the created order
    const response = await fetch('/api/payments/benpharm-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'one-time',
        productId: createdOrderId,
        email: orderData.customerEmail,
        name: orderData.customerName,
        redirectUrl: `${window.location.origin}/app/orders?payment=success`,
        orderId: createdOrderId,
        customer: {
          email: orderData.customerEmail,
          phone: formatNigerianPhone(orderData.deliveryPhone),
          name: orderData.customerName,
          state: orderData.deliveryState,
          lga: orderData.deliveryLGA
        },
        items: cartData?.data?.items?.map((item: CartItem) => ({
          productId: item.product.id,
          sku: (item.product as any)?.sku || undefined,
          name: item.product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice * 100
        })) || [],
        totalAmount: Math.round(createdOrderTotal * 100),
        deliveryAddress: orderData.deliveryAddress,
        deliveryFee: deliveryFee * 100,
        deliveryMethod: orderData.deliveryMethod,
        gateway: orderData.paymentMethod,
        purchaseOrderNumber: orderData.purchaseOrderNumber
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Failed to create payment')
    }
    
    const result = await response.json()
    return {
      paymentUrl: result.checkoutLink,
      orderId: createdOrderId,
      orderNumber: createdOrderNumber
    }
  }
  
  // Create direct order using traditional system
  const createDirectOrder = async (orderData: EnhancedCheckoutFormData) => {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cartData?.data?.items?.map((item: CartItem) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        })) || [],
        deliveryMethod: orderData.deliveryMethod,
        deliveryAddress: orderData.deliveryAddress,
        deliveryCity: 'Benin City',
        deliveryState: orderData.deliveryState,
        deliveryLGA: orderData.deliveryLGA,
        deliveryPhone: orderData.deliveryPhone,
        deliveryNotes: orderData.deliveryNotes,
        purchaseOrderNumber: orderData.purchaseOrderNumber
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Failed to create order')
    }
    
    const result = await response.json()
    return {
      paymentUrl: null,
      orderId: result.data.order.id,
      orderNumber: result.data.order.orderNumber
    }
  }
  
  // Helper function to format Nigerian phone numbers
  const formatNigerianPhone = (phone: string): string => {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '')
    
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      return `+234${cleaned.slice(1)}`
    }
    
    if (cleaned.startsWith('234') && cleaned.length === 13) {
      return `+${cleaned}`
    }
    
    if (cleaned.startsWith('+234')) {
      return cleaned
    }
    
    return phone
  }
  
  // Calculate delivery fee
  const deliveryMethod = form.watch('deliveryMethod')
  const deliveryFee = deliveryMethod === 'EXPRESS' ? (isNigerianUser ? 1000 : 1000) : 
                     deliveryMethod === 'STANDARD' ? (isNigerianUser ? 500 : 500) : 0
  
  const subtotal = cartData?.data?.summary?.subtotal || 0
  const total = subtotal + deliveryFee

  // Prescription upload state (optional, shown when required)
  const prescriptionUploadRef = useRef<CheckoutPrescriptionUploadRef>(null)
  const [prescriptionFiles, setPrescriptionFiles] = useState<CheckoutPrescriptionFile[]>([])
  const requiresPrescription = cartItems?.some(
    (item: any) => item?.product?.is_prescription_required || item?.product?.isPrescriptionRequired || item?.product?.isControlled
  )

  const onSubmit = (data: EnhancedCheckoutFormData) => {
    createEnhancedOrderMutation.mutate(data)
  }
  
  if (cartLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }
  
  if (!cartData?.data?.items?.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-6">Add products to continue</p>
          <Button onClick={onCancel}>Continue Shopping</Button>
        </CardContent>
      </Card>
    )
  }

  // Order complete state
  if (orderComplete) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Order Created Successfully!</h2>
          <p className="text-muted-foreground mb-6">
            Your order has been created and will be processed shortly.
          </p>
          <div className="space-y-2 w-full">
            <Button onClick={() => onSuccess?.('')} className="w-full">
              View Orders
            </Button>
            <Button onClick={onCancel} variant="outline" className="w-full">
              Continue Shopping
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Payment redirect state
  if (paymentUrl) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Loader2 className="h-16 w-16 animate-spin text-blue-600 mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Redirecting to Payment Gateway</h2>
          <p className="text-muted-foreground mb-6">
            Please wait while we redirect you to complete your payment...
          </p>
          <div className="flex items-center text-sm text-green-600">
            <Globe className="h-4 w-4 mr-2" />
            Secure Nigerian Payment Processing
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-3">
      {/* Customer Information */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <User className="h-5 w-5 text-muted-foreground" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">Full Name</Label>
                <Input
                  id="customerName"
                  {...form.register('customerName')}
                  placeholder="Enter your full name"
                  className={form.formState.errors.customerName ? 'border-destructive' : ''}
                />
                {form.formState.errors.customerName && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.customerName.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="customerEmail">Email Address</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  {...form.register('customerEmail')}
                  placeholder="Enter your email"
                  className={form.formState.errors.customerEmail ? 'border-destructive' : ''}
                />
                {form.formState.errors.customerEmail && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.customerEmail.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Truck className="h-5 w-5 text-muted-foreground" />
              Delivery Options
              {isNigerianUser && (
                <Badge variant="outline" className="ml-auto">
                  <Globe className="h-3 w-3 mr-1" />
                  Nigerian System
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Delivery Method</Label>
              <RadioGroup
                value={form.watch('deliveryMethod')}
                onValueChange={(value: any) => {
                  form.setValue('deliveryMethod', value)
                  setCheckoutForm(prev => ({ ...prev, deliveryMethod: value }))
                }}
                className="grid grid-cols-1 gap-4 mt-2"
              >
                <div className="flex items-center space-x-2 p-4 border rounded-lg">
                  <RadioGroupItem value="PICKUP" id="pickup" />
                  <Label htmlFor="pickup" className="flex-1 cursor-pointer">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Store Pickup</p>
                        <p className="text-sm text-muted-foreground">Pick up from our Benin City location</p>
                      </div>
                      <Badge variant="secondary">Free</Badge>
                    </div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2 p-4 border rounded-lg">
                  <RadioGroupItem value="STANDARD" id="standard" />
                  <Label htmlFor="standard" className="flex-1 cursor-pointer">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Standard Delivery</p>
                        <p className="text-sm text-muted-foreground">3-5 business days</p>
                      </div>
                      <Badge>{formatNaira(500)}</Badge>
                    </div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2 p-4 border rounded-lg">
                  <RadioGroupItem value="EXPRESS" id="express" />
                  <Label htmlFor="express" className="flex-1 cursor-pointer">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Express Delivery</p>
                        <p className="text-sm text-muted-foreground">1-2 business days</p>
                      </div>
                      <Badge>{formatNaira(1000)}</Badge>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>
        
        {/* Delivery Address (only show if not pickup) */}
        {form.watch('deliveryMethod') !== 'PICKUP' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                Delivery Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="deliveryAddress">Street Address</Label>
                <Input
                  id="deliveryAddress"
                  {...form.register('deliveryAddress')}
                  placeholder="Enter your full address"
                  className={form.formState.errors.deliveryAddress ? 'border-destructive' : ''}
                />
                {form.formState.errors.deliveryAddress && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.deliveryAddress.message}
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="deliveryCity">City</Label>
                  <Input
                    id="deliveryCity"
                    {...form.register('deliveryCity')}
                    placeholder="City"
                    className={form.formState.errors.deliveryCity ? 'border-destructive' : ''}
                  />
                  {form.formState.errors.deliveryCity && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.deliveryCity.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="deliveryPhone">
                    Phone Number 
                    {isNigerianUser && <span className="text-sm text-muted-foreground ml-1">(+234XXXXXXXXXX)</span>}
                  </Label>
                  <Input
                    id="deliveryPhone"
                    {...form.register('deliveryPhone')}
                    placeholder={isNigerianUser ? "+234 XXX XXX XXXX" : "Phone number"}
                    className={form.formState.errors.deliveryPhone ? 'border-destructive' : ''}
                  />
                  {form.formState.errors.deliveryPhone && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.deliveryPhone.message}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="deliveryState">State</Label>
                  <Select
                    value={form.watch('deliveryState')}
                    onValueChange={(value) => form.setValue('deliveryState', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px] overflow-y-auto">
                      {nigerianStates.filter(s => !!s).map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="deliveryLGA">LGA (Optional)</Label>
                  <Select
                    value={form.watch('deliveryLGA')}
                    onValueChange={(value) => form.setValue('deliveryLGA', value)}
                    disabled={!form.watch('deliveryState')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select LGA" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px] overflow-y-auto">
                      {form.watch('deliveryState') && getLGAs(form.watch('deliveryState')).filter(l => !!l).map((lga) => (
                        <SelectItem key={lga} value={lga}>
                          {lga}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="deliveryNotes">Delivery Instructions (Optional)</Label>
                <Textarea
                  id="deliveryNotes"
                  {...form.register('deliveryNotes')}
                  placeholder="Special delivery instructions, landmarks, etc."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Prescription Upload (if required) */}
        {requiresPrescription ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Upload className="h-5 w-5 text-muted-foreground" />
                Prescription Upload
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Your cart contains prescription-required items. Upload a clear image or PDF of your prescription.
              </p>
              <CheckoutPrescriptionUpload
                ref={prescriptionUploadRef}
                onFilesChange={setPrescriptionFiles}
                compact={true}
              />
            </CardContent>
          </Card>
        ) : null}
        
        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              Payment Method
              {isNigerianUser && (
                <Badge variant="outline" className="ml-auto">
                  <Globe className="h-3 w-3 mr-1" />
                  Nigerian Gateways Available
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={form.watch('paymentMethod')}
              onValueChange={(value: any) => {
                form.setValue('paymentMethod', value)
                setCheckoutForm(prev => ({ ...prev, paymentMethod: value }))
              }}
              className="grid gap-3"
            >
              {/* Nigerian Payment Gateways (show first if Nigerian user) */}
              {isNigerianUser && (
                <>
                  <div className="flex items-center space-x-2 p-4 border rounded-lg bg-green-50">
                    <RadioGroupItem value="FLUTTERWAVE" id="flutterwave" />
                    <Label htmlFor="flutterwave" className="flex-1 cursor-pointer">
                      <div className="flex justify-between">
                        <span className="font-medium">Flutterwave</span>
                        <Badge variant="secondary">Primary</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Card, Bank Transfer, USSD</p>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-4 border rounded-lg">
                    <RadioGroupItem value="OPAY" id="opay" />
                    <Label htmlFor="opay" className="flex-1 cursor-pointer">
                      <span className="font-medium">OPay</span>
                      <p className="text-sm text-muted-foreground">Digital wallet payments</p>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-4 border rounded-lg">
                    <RadioGroupItem value="PAYSTACK" id="paystack" />
                    <Label htmlFor="paystack" className="flex-1 cursor-pointer">
                      <span className="font-medium">Paystack</span>
                      <p className="text-sm text-muted-foreground">Card and bank payments</p>
                    </Label>
                  </div>
                </>
              )}
              
              {/* Direct Order Option */}
              <div className="flex items-center space-x-2 p-4 border rounded-lg">
                <RadioGroupItem value="DIRECT_ORDER" id="direct-order" />
                <Label htmlFor="direct-order" className="flex-1 cursor-pointer">
                  <span className="font-medium">Direct Order</span>
                  <p className="text-sm text-muted-foreground">Pay on delivery or via invoice</p>
                </Label>
              </div>
            </RadioGroup>
            
            {/* Purchase Order Number for wholesale customers */}
            {(cartData as any)?.data?.customerInfo?.customerType !== 'RETAIL' && (
              <div className="mt-4">
                <Label htmlFor="purchaseOrderNumber">Purchase Order Number (Optional)</Label>
                <Input
                  id="purchaseOrderNumber"
                  {...form.register('purchaseOrderNumber')}
                  placeholder="Enter your PO number"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Order Summary */}
      <div>
        <Card className="sticky top-4">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Items ({cartData.data.summary.itemCount})</span>
                <span>{formatNaira(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Delivery</span>
                <span>{formatNaira(deliveryFee)}</span>
              </div>
              {isNigerianUser && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Gateway Fee</span>
                  <span>Included</span>
                </div>
              )}
              <Separator className="my-3" />
              <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                <span className="text-base font-medium">Total</span>
                <span className="text-xl font-semibold">{formatNaira(total)}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading || !form.formState.isValid}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {form.watch('paymentMethod') === 'DIRECT_ORDER' ? 'Creating Order...' : 'Creating Payment...'}
                  </>
                ) : (
                  form.watch('paymentMethod') === 'DIRECT_ORDER' ? 'Place Order' : 'Proceed to Payment'
                )}
              </Button>
              
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={onCancel}
                  disabled={isLoading}
                >
                  Back to Cart
                </Button>
              )}
            </div>
            
            {isNigerianUser && (
              <div className="text-xs text-center text-green-600 bg-green-50 p-2 rounded">
                <Globe className="h-3 w-3 inline mr-1" />
                Secure Nigerian payment processing
              </div>
            )}
            
            <div className="text-xs text-muted-foreground text-center">
              By placing this order, you agree to our terms and conditions
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
