'use client'

import { atom, useAtom, useAtomValue } from 'jotai'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, CreditCard, Truck, Package, MapPin, Phone, User } from 'lucide-react'
import { nigerianStates, getLGAs, formatNaira } from '@/lib/nigerian-locations'
import { 
  selectedDeliveryTypeAtom,
  deliveryAddressAtom,
  selectedStateAtom,
  selectedLGAAtom,
  phoneNumberAtom
} from '../../cart/lib/cart-store'

// Local atoms for checkout form
const checkoutFormAtom = atom({
  deliveryMethod: 'STANDARD' as 'STANDARD' | 'EXPRESS' | 'PICKUP',
  paymentMethod: 'FLUTTERWAVE' as 'FLUTTERWAVE' | 'OPAY' | 'PAYSTACK' | 'CREDIT',
  purchaseOrderNumber: ''
})

const checkoutLoadingAtom = atom(false)

// Form schema
const checkoutSchema = z.object({
  deliveryMethod: z.enum(['STANDARD', 'EXPRESS', 'PICKUP']),
  deliveryAddress: z.string().min(5, 'Address must be at least 5 characters'),
  deliveryCity: z.string().min(2, 'City is required'),
  deliveryState: z.string().min(2, 'State is required'),
  deliveryLGA: z.string().optional(),
  deliveryPhone: z.string().min(10, 'Valid phone number required'),
  deliveryNotes: z.string().optional(),
  paymentMethod: z.enum(['FLUTTERWAVE', 'OPAY', 'PAYSTACK', 'CREDIT']).optional(),
  purchaseOrderNumber: z.string().optional()
}).refine((data) => {
  if (data.deliveryMethod !== 'PICKUP') {
    return data.deliveryAddress && data.deliveryCity && data.deliveryState && data.deliveryPhone
  }
  return true
}, {
  message: 'Delivery details are required for delivery orders'
})

type CheckoutFormData = z.infer<typeof checkoutSchema>

interface CartItem {
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
  totalPrice: number
}

interface CheckoutFormProps {
  onSuccess?: (orderId: string) => void
  onCancel?: () => void
}

export function CheckoutForm({ onSuccess, onCancel }: CheckoutFormProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  // Atoms
  const [checkoutForm, setCheckoutForm] = useAtom(checkoutFormAtom)
  const [isLoading, setIsLoading] = useAtom(checkoutLoadingAtom)
  const selectedState = useAtomValue(selectedStateAtom)
  const selectedLGA = useAtomValue(selectedLGAAtom)
  const deliveryAddress = useAtomValue(deliveryAddressAtom)
  const phoneNumber = useAtomValue(phoneNumberAtom)
  
  // Form setup
  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      deliveryMethod: checkoutForm.deliveryMethod,
      deliveryAddress,
      deliveryCity: 'Benin City', // Default for BenPharm
      deliveryState: selectedState || 'Edo',
      deliveryLGA: selectedLGA,
      deliveryPhone: phoneNumber,
      deliveryNotes: '',
      paymentMethod: checkoutForm.paymentMethod,
      purchaseOrderNumber: checkoutForm.purchaseOrderNumber
    }
  })
  
  // Get cart data
  const { data: cartData, isLoading: cartLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const response = await fetch('/api/cart')
      if (!response.ok) throw new Error('Failed to fetch cart')
      const data = await response.json()
      return data
    }
  })
  
  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: CheckoutFormData) => {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: cartData?.data?.items?.map((item: CartItem) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice
          })) || [],
          ...orderData
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to create order')
      }
      
      return response.json()
    },
    onMutate: () => {
      setIsLoading(true)
    },
    onSuccess: (data) => {
      setIsLoading(false)
      toast({
        title: 'Order Created Successfully!',
        description: `Your order #${data.data.order.orderNumber} has been created.`
      })
      
      // Clear cart and refresh
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      
      // Callback with order ID
      if (onSuccess) {
        onSuccess(data.data.order.id)
      }
    },
    onError: (error) => {
      setIsLoading(false)
      toast({
        title: 'Order Creation Failed',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
  
  // Calculate delivery fee
  const deliveryMethod = form.watch('deliveryMethod')
  const deliveryFee = deliveryMethod === 'EXPRESS' ? 1000 : 
                     deliveryMethod === 'STANDARD' ? 500 : 0
  
  const subtotal = cartData?.data?.summary?.subtotal || 0
  const total = subtotal + deliveryFee
  
  const onSubmit = (data: CheckoutFormData) => {
    createOrderMutation.mutate(data)
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
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-3">
      {/* Delivery Information */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Delivery Options
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
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
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
                  <Label htmlFor="deliveryPhone">Phone Number</Label>
                  <Input
                    id="deliveryPhone"
                    {...form.register('deliveryPhone')}
                    placeholder="+234 XXX XXX XXXX"
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
                    <SelectContent>
                      {nigerianStates.map((state) => (
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
                    <SelectContent>
                      {form.watch('deliveryState') && getLGAs(form.watch('deliveryState')).map((lga) => (
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
        
        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Method
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
              <div className="flex items-center space-x-2 p-4 border rounded-lg">
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
            </RadioGroup>
            
            {/* Purchase Order Number for wholesale customers */}
            {cartData?.data?.customerInfo?.customerType !== 'RETAIL' && (
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
            <CardTitle>Order Summary</CardTitle>
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
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatNaira(total)}</span>
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
                    Creating Order...
                  </>
                ) : (
                  'Place Order'
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
            
            <div className="text-xs text-muted-foreground text-center">
              By placing this order, you agree to our terms and conditions
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
