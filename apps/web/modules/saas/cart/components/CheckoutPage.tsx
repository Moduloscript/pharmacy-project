'use client';

import { useState } from 'react';
import { useAtomValue, useAtom } from 'jotai';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { Badge } from '@ui/components/badge';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { Textarea } from '@ui/components/textarea';
import { RadioGroup, RadioGroupItem } from '@ui/components/radio-group';
import { Checkbox } from '@ui/components/checkbox';
import { cn } from '@ui/lib';
import { 
  ShoppingCartIcon, 
  ArrowLeftIcon, 
  CreditCardIcon,
  MapPinIcon,
  TruckIcon,
  FileTextIcon,
  ShieldCheckIcon,
  LoaderIcon,
  CheckCircleIcon
} from 'lucide-react';
import { 
  cartSummaryAtom,
  validateCartAtom,
  deliveryOptionAtom,
  clearCartAtom
} from '../lib/cart-store';
import { CartItem } from './CartItem';
import Link from 'next/link';

interface CheckoutPageProps {
  className?: string;
  onOrderComplete?: (orderId: string) => void;
}

interface ShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  instructions?: string;
}

interface PaymentMethod {
  type: 'card' | 'transfer' | 'cash';
  cardNumber?: string;
  expiryDate?: string;
  cvv?: string;
  bankName?: string;
}

export function CheckoutPage({ className, onOrderComplete }: CheckoutPageProps) {
  const cartSummary = useAtomValue(cartSummaryAtom);
  const cartValidation = useAtomValue(validateCartAtom);
  const [deliveryOption, setDeliveryOption] = useAtom(deliveryOptionAtom);
  const [, clearCart] = useAtom(clearCartAtom);

  const [currentStep, setCurrentStep] = useState<'shipping' | 'payment' | 'review'>('shipping');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: 'Benin City',
    state: 'Edo State',
    zipCode: '',
    instructions: ''
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>({
    type: 'card'
  });

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [prescriptionFiles, setPrescriptionFiles] = useState<File[]>([]);

  const handleShippingNext = () => {
    // Validate shipping form
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'address'] as const;
    const isValid = requiredFields.every(field => shippingAddress[field]?.trim());
    
    if (!isValid) {
      alert('Please fill in all required shipping fields');
      return;
    }

    setCurrentStep('payment');
  };

  const handlePaymentNext = () => {
    // Validate payment method
    if (paymentMethod.type === 'card') {
      if (!paymentMethod.cardNumber || !paymentMethod.expiryDate || !paymentMethod.cvv) {
        alert('Please fill in all card details');
        return;
      }
    }

    setCurrentStep('review');
  };

  const handlePlaceOrder = async () => {
    if (!agreedToTerms) {
      alert('Please agree to the terms and conditions');
      return;
    }

    if (!cartValidation.isValid) {
      alert('Please fix cart issues before placing order');
      return;
    }

    setIsProcessing(true);

    try {
      // Simulate order processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const newOrderId = `ORD-${Date.now()}`;
      setOrderId(newOrderId);
      setOrderComplete(true);
      clearCart();

      if (onOrderComplete) {
        onOrderComplete(newOrderId);
      }
    } catch (error) {
      alert('Failed to place order. Please try again.');
      console.error('Order placement failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrescriptionUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setPrescriptionFiles(prev => [...prev, ...files]);
  };

  const removePrescriptionFile = (index: number) => {
    setPrescriptionFiles(prev => prev.filter((_, i) => i !== index));
  };

  const prescriptionItems = cartSummary.items.filter(item => item.requiresPrescription);

  if (cartSummary.isEmpty) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <ShoppingCartIcon className="size-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-4">Add some items to your cart before checkout</p>
          <Link href="/app/products">
            <Button>Continue Shopping</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <CheckCircleIcon className="size-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Order Placed Successfully!</h2>
          <p className="text-gray-600 mb-4">
            Your order {orderId} has been placed and is being processed.
          </p>
          <div className="space-y-2">
            <Link href="/app/orders">
              <Button className="w-full">View Orders</Button>
            </Link>
            <Link href="/app/products">
              <Button variant="outline" className="w-full">Continue Shopping</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen bg-gray-50', className)}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/app/cart">
              <Button variant="ghost" size="sm">
                <ArrowLeftIcon className="size-4 mr-2" />
                Back to Cart
              </Button>
            </Link>
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <CreditCardIcon className="size-8 mr-3" />
                Checkout
              </h1>
              <p className="text-gray-600 mt-1">Complete your order</p>
            </div>
          </div>

          <Badge variant="secondary">
            {cartSummary.totalQuantity} items • ₦{cartSummary.grandTotal.toLocaleString()}
          </Badge>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[
              { key: 'shipping', label: 'Shipping', icon: MapPinIcon },
              { key: 'payment', label: 'Payment', icon: CreditCardIcon },
              { key: 'review', label: 'Review', icon: FileTextIcon }
            ].map(({ key, label, icon: Icon }, index) => (
              <div key={key} className="flex items-center">
                <div className={cn(
                  'flex items-center justify-center size-10 rounded-full border-2 transition-colors',
                  currentStep === key 
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : index < ['shipping', 'payment', 'review'].indexOf(currentStep)
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-gray-300 bg-white text-gray-400'
                )}>
                  <Icon className="size-5" />
                </div>
                <span className={cn(
                  'ml-3 font-medium',
                  currentStep === key || index < ['shipping', 'payment', 'review'].indexOf(currentStep)
                    ? 'text-gray-900'
                    : 'text-gray-400'
                )}>
                  {label}
                </span>
                {index < 2 && (
                  <div className={cn(
                    'w-16 h-0.5 mx-4',
                    index < ['shipping', 'payment', 'review'].indexOf(currentStep)
                      ? 'bg-green-600'
                      : 'bg-gray-300'
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Shipping Step */}
            {currentStep === 'shipping' && (
              <Card className="p-6">
                <div className="flex items-center mb-6">
                  <MapPinIcon className="size-6 text-blue-600 mr-3" />
                  <h2 className="text-xl font-semibold text-gray-900">Shipping Information</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={shippingAddress.firstName}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, firstName: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={shippingAddress.lastName}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, lastName: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={shippingAddress.email}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={shippingAddress.phone}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, phone: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="address">Street Address *</Label>
                    <Input
                      id="address"
                      value={shippingAddress.address}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, address: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={shippingAddress.city}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, city: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={shippingAddress.state}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, state: e.target.value }))}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="instructions">Delivery Instructions (Optional)</Label>
                    <Textarea
                      id="instructions"
                      value={shippingAddress.instructions}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, instructions: e.target.value }))}
                      placeholder="Any special delivery instructions..."
                      rows={3}
                    />
                  </div>
                </div>

                {/* Delivery Options */}
                <div className="mb-6">
                  <Label className="text-base font-semibold mb-3 block">Delivery Option</Label>
                  <RadioGroup value={deliveryOption} onValueChange={setDeliveryOption}>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <RadioGroupItem value="standard" id="standard" />
                      <Label htmlFor="standard" className="flex items-center justify-between w-full cursor-pointer">
                        <div className="flex items-center">
                          <TruckIcon className="size-5 mr-3 text-blue-600" />
                          <div>
                            <p className="font-medium">Standard Delivery</p>
                            <p className="text-sm text-gray-600">2-3 business days</p>
                          </div>
                        </div>
                        <span className="font-semibold">₦500</span>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <RadioGroupItem value="express" id="express" />
                      <Label htmlFor="express" className="flex items-center justify-between w-full cursor-pointer">
                        <div className="flex items-center">
                          <TruckIcon className="size-5 mr-3 text-orange-600" />
                          <div>
                            <p className="font-medium">Express Delivery</p>
                            <p className="text-sm text-gray-600">Same day within Benin City</p>
                          </div>
                        </div>
                        <span className="font-semibold">₦1,500</span>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <RadioGroupItem value="pickup" id="pickup" />
                      <Label htmlFor="pickup" className="flex items-center justify-between w-full cursor-pointer">
                        <div className="flex items-center">
                          <MapPinIcon className="size-5 mr-3 text-green-600" />
                          <div>
                            <p className="font-medium">Store Pickup</p>
                            <p className="text-sm text-gray-600">Ready in 1-2 hours</p>
                          </div>
                        </div>
                        <span className="font-semibold">Free</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Prescription Upload */}
                {prescriptionItems.length > 0 && (
                  <div className="mb-6">
                    <Label className="text-base font-semibold mb-3 block">
                      Prescription Upload ({prescriptionItems.length} items require prescription)
                    </Label>
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                      <div className="flex items-start space-x-3">
                        <FileTextIcon className="size-5 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-yellow-900">Prescription Required</p>
                          <p className="text-sm text-yellow-700 mt-1">
                            Please upload valid prescriptions for: {prescriptionItems.map(item => item.name).join(', ')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handlePrescriptionUpload}
                      className="mb-3"
                    />

                    {prescriptionFiles.length > 0 && (
                      <div className="space-y-2">
                        {prescriptionFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm text-gray-700">{file.name}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removePrescriptionFile(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <Button onClick={handleShippingNext} className="w-full">
                  Continue to Payment
                </Button>
              </Card>
            )}

            {/* Payment Step */}
            {currentStep === 'payment' && (
              <Card className="p-6">
                <div className="flex items-center mb-6">
                  <CreditCardIcon className="size-6 text-blue-600 mr-3" />
                  <h2 className="text-xl font-semibold text-gray-900">Payment Method</h2>
                </div>

                <RadioGroup value={paymentMethod.type} onValueChange={(value) => setPaymentMethod(prev => ({ ...prev, type: value as 'card' | 'transfer' | 'cash' }))}>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <RadioGroupItem value="card" id="card" />
                      <Label htmlFor="card" className="flex items-center cursor-pointer">
                        <CreditCardIcon className="size-5 mr-3 text-blue-600" />
                        <span>Credit/Debit Card</span>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <RadioGroupItem value="transfer" id="transfer" />
                      <Label htmlFor="transfer" className="flex items-center cursor-pointer">
                        <ShieldCheckIcon className="size-5 mr-3 text-green-600" />
                        <span>Bank Transfer</span>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <RadioGroupItem value="cash" id="cash" />
                      <Label htmlFor="cash" className="flex items-center cursor-pointer">
                        <TruckIcon className="size-5 mr-3 text-orange-600" />
                        <span>Cash on Delivery</span>
                      </Label>
                    </div>
                  </div>
                </RadioGroup>

                {paymentMethod.type === 'card' && (
                  <div className="mt-6 space-y-4">
                    <div>
                      <Label htmlFor="cardNumber">Card Number *</Label>
                      <Input
                        id="cardNumber"
                        placeholder="1234 5678 9012 3456"
                        value={paymentMethod.cardNumber || ''}
                        onChange={(e) => setPaymentMethod(prev => ({ ...prev, cardNumber: e.target.value }))}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="expiryDate">Expiry Date *</Label>
                        <Input
                          id="expiryDate"
                          placeholder="MM/YY"
                          value={paymentMethod.expiryDate || ''}
                          onChange={(e) => setPaymentMethod(prev => ({ ...prev, expiryDate: e.target.value }))}
                        />
                      </div>

                      <div>
                        <Label htmlFor="cvv">CVV *</Label>
                        <Input
                          id="cvv"
                          placeholder="123"
                          value={paymentMethod.cvv || ''}
                          onChange={(e) => setPaymentMethod(prev => ({ ...prev, cvv: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod.type === 'transfer' && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">Bank Transfer Details</h3>
                    <p className="text-sm text-blue-700 mb-3">
                      Complete your payment using the details below and upload proof of payment.
                    </p>
                    <div className="text-sm space-y-1">
                      <p><strong>Bank:</strong> First Bank Nigeria</p>
                      <p><strong>Account Name:</strong> ModuloScript Pharmacy</p>
                      <p><strong>Account Number:</strong> 1234567890</p>
                      <p><strong>Amount:</strong> ₦{cartSummary.grandTotal.toLocaleString()}</p>
                    </div>
                  </div>
                )}

                <div className="flex space-x-4 mt-6">
                  <Button variant="outline" onClick={() => setCurrentStep('shipping')} className="flex-1">
                    Back
                  </Button>
                  <Button onClick={handlePaymentNext} className="flex-1">
                    Review Order
                  </Button>
                </div>
              </Card>
            )}

            {/* Review Step */}
            {currentStep === 'review' && (
              <Card className="p-6">
                <div className="flex items-center mb-6">
                  <FileTextIcon className="size-6 text-blue-600 mr-3" />
                  <h2 className="text-xl font-semibold text-gray-900">Order Review</h2>
                </div>

                {/* Order Summary */}
                <div className="space-y-6 mb-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Shipping Address</h3>
                    <div className="p-4 bg-gray-50 rounded-lg text-sm">
                      <p>{shippingAddress.firstName} {shippingAddress.lastName}</p>
                      <p>{shippingAddress.address}</p>
                      <p>{shippingAddress.city}, {shippingAddress.state}</p>
                      <p>{shippingAddress.phone}</p>
                      <p>{shippingAddress.email}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Payment Method</h3>
                    <div className="p-4 bg-gray-50 rounded-lg text-sm">
                      <p className="capitalize">{paymentMethod.type.replace('_', ' ')}</p>
                      {paymentMethod.type === 'card' && paymentMethod.cardNumber && (
                        <p>**** **** **** {paymentMethod.cardNumber.slice(-4)}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Delivery Option</h3>
                    <div className="p-4 bg-gray-50 rounded-lg text-sm">
                      <p className="capitalize">{deliveryOption.replace('_', ' ')} Delivery</p>
                    </div>
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="mb-6">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="terms"
                      checked={agreedToTerms}
                      onCheckedChange={setAgreedToTerms}
                    />
                    <Label htmlFor="terms" className="text-sm">
                      I agree to the{' '}
                      <Link href="/terms" className="text-blue-600 hover:underline">
                        Terms and Conditions
                      </Link>
                      {' '}and{' '}
                      <Link href="/privacy" className="text-blue-600 hover:underline">
                        Privacy Policy
                      </Link>
                    </Label>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <Button variant="outline" onClick={() => setCurrentStep('payment')} className="flex-1">
                    Back
                  </Button>
                  <Button
                    onClick={handlePlaceOrder}
                    disabled={!agreedToTerms || isProcessing}
                    className="flex-1"
                  >
                    {isProcessing ? (
                      <>
                        <LoaderIcon className="size-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Place Order • ₦${cartSummary.grandTotal.toLocaleString()}`
                    )}
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
                
                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {cartSummary.items.map((item) => (
                    <CartItem
                      key={item.id}
                      item={item}
                      compact={true}
                      showQuantityControls={false}
                    />
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>₦{cartSummary.subtotal.toLocaleString()}</span>
                  </div>
                  
                  {cartSummary.discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-₦{cartSummary.discount.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span>Delivery</span>
                    <span>₦{cartSummary.deliveryFee.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span>Tax</span>
                    <span>₦{cartSummary.tax.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span>₦{cartSummary.grandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
