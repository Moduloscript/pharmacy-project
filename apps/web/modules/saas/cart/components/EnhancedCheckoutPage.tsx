'use client';

import { useState, useEffect } from 'react';
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
import { Alert, AlertTitle, AlertDescription } from '@ui/components/alert';
import { 
  ShoppingCartIcon, 
  ArrowLeftIcon, 
  CreditCardIcon,
  MapPinIcon,
  TruckIcon,
  FileTextIcon,
  ShieldCheckIcon,
  LoaderIcon,
  CheckCircleIcon,
  GlobeIcon
} from 'lucide-react';
import { 
  cartSummaryAtom,
  validateCartAtom,
  selectedDeliveryAtom as deliveryOptionAtom,
  clearCartAtom,
  type DeliveryOption
} from '../lib/cart-store';
import { CartItem } from './CartItem';
import Link from 'next/link';

interface EnhancedCheckoutPageProps {
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
  type: 'card' | 'transfer' | 'cash' | 'nigerian_gateway';
  cardNumber?: string;
  expiryDate?: string;
  cvv?: string;
  bankName?: string;
  nigerianGateway?: 'FLUTTERWAVE' | 'PAYSTACK' | 'OPAY';
}

// Nigerian states for dropdown
const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

export function EnhancedCheckoutPage({ className, onOrderComplete }: EnhancedCheckoutPageProps) {
  const cartSummary = useAtomValue(cartSummaryAtom);
  const cartValidation = useAtomValue(validateCartAtom);
  const [deliveryOption, setDeliveryOption] = useAtom(deliveryOptionAtom);
  const [, clearCart] = useAtom(clearCartAtom);

  const [currentStep, setCurrentStep] = useState<'shipping' | 'payment' | 'review'>('shipping');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isNigerianUser, setIsNigerianUser] = useState(false);

  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: 'Lagos',
    state: 'Lagos',
    zipCode: '',
    instructions: ''
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>({
    type: 'card'
  });

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [prescriptionFiles, setPrescriptionFiles] = useState<File[]>([]);

  // Detect if user is Nigerian based on currency or other factors
  useEffect(() => {
    const currency = process.env.NEXT_PUBLIC_CURRENCY;
    const currencySymbol = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL;
    
    if (currency === 'NGN' || currencySymbol === '₦') {
      setIsNigerianUser(true);
      // Update default payment method for Nigerian users
      setPaymentMethod(prev => ({ ...prev, type: 'nigerian_gateway', nigerianGateway: 'FLUTTERWAVE' }));
    }
  }, []);

  const handleShippingNext = () => {
    // Validate shipping form
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'address'] as const;
    const isValid = requiredFields.every(field => shippingAddress[field]?.trim());
    
    // Additional validation for Nigerian phone numbers
    if (isNigerianUser && shippingAddress.phone && !validateNigerianPhone(shippingAddress.phone)) {
      alert('Please enter a valid Nigerian phone number (e.g., +234XXXXXXXXXX or 08XXXXXXXXX)');
      return;
    }
    
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
    } else if (paymentMethod.type === 'nigerian_gateway') {
      if (!paymentMethod.nigerianGateway) {
        alert('Please select a payment gateway');
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
      let checkoutUrl: string | null = null;

      if (isNigerianUser && paymentMethod.type === 'nigerian_gateway') {
        // Use Nigerian payment system
        checkoutUrl = await createNigerianCheckout();
      } else {
        // Use traditional payment system
        checkoutUrl = await createTraditionalCheckout();
      }

      if (checkoutUrl) {
        // Redirect to payment gateway
        window.location.href = checkoutUrl;
      } else {
        throw new Error('Failed to create checkout URL');
      }
    } catch (error) {
      alert('Failed to place order. Please try again.');
      console.error('Order placement failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const createNigerianCheckout = async (): Promise<string | null> => {
    // This would integrate with your Nigerian payment API
    const orderData = {
      customer: {
        email: shippingAddress.email,
        phone: formatNigerianPhone(shippingAddress.phone),
        name: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
        state: shippingAddress.state
      },
      items: cartSummary.items.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      })),
      totalAmount: cartSummary.grandTotal * 100, // Convert to kobo
      deliveryAddress: shippingAddress.address,
      deliveryFee: cartSummary.deliveryFee * 100,
      gateway: paymentMethod.nigerianGateway,
      redirectUrl: `${window.location.origin}/app/checkout/success`
    };

    // Call your enhanced API endpoint
    const response = await fetch('/api/payments/create-checkout-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'one-time',
        productId: `pharmacy_order_${Date.now()}`,
        ...orderData,
        // Override redirectUrl from orderData if needed
        redirectUrl: orderData.redirectUrl
      })
    });

    const { checkoutLink } = await response.json();
    return checkoutLink;
  };

  const createTraditionalCheckout = async (): Promise<string | null> => {
    // Traditional checkout flow (Stripe, etc.)
    // This is a placeholder - implement based on your existing logic
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const newOrderId = `ORD-${Date.now()}`;
    setOrderId(newOrderId);
    setOrderComplete(true);
    clearCart();

    if (onOrderComplete) {
      onOrderComplete(newOrderId);
    }

    return null; // No redirect needed for simulation
  };

  const validateNigerianPhone = (phone: string): boolean => {
    // Remove spaces and special characters
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    
    // Check for Nigerian phone number patterns
    const patterns = [
      /^(\+234|234)[789]\d{9}$/, // +234 or 234 format
      /^0[789]\d{9}$/ // Local format starting with 0
    ];
    
    return patterns.some(pattern => pattern.test(cleaned));
  };

  const formatNigerianPhone = (phone: string): string => {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      return `+234${cleaned.slice(1)}`;
    }
    
    if (cleaned.startsWith('234') && cleaned.length === 13) {
      return `+${cleaned}`;
    }
    
    if (cleaned.startsWith('+234')) {
      return cleaned;
    }
    
    return phone; // Return as-is if format is unclear
  };

  const handlePrescriptionUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setPrescriptionFiles(prev => [...prev, ...files]);
  };

  const removePrescriptionFile = (index: number) => {
    setPrescriptionFiles(prev => prev.filter((_, i) => i !== index));
  };

  const prescriptionItems = cartSummary.items.filter(
    (item) =>
    item.product?.is_prescription_required ||
    item.product?.isPrescriptionRequired ||
    item.product?.isControlled
  );

  if (cartSummary.isEmpty) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
<ShoppingCartIcon className="size-16 text-muted-foreground mx-auto mb-4" />
<h2 className="text-xl font-semibold text-card-foreground mb-2">Your cart is empty</h2>
<p className="text-muted-foreground mb-4">Add some items to your cart before checkout</p>
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
<CheckCircleIcon className="size-16 text-success mx-auto mb-4" />
<h2 className="text-xl font-semibold text-card-foreground mb-2">Order Placed Successfully!</h2>
<p className="text-muted-foreground mb-4">
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
<div className={cn('min-h-screen bg-background', className)}>
      <div className="container mx-auto px-4 py-8 pb-24 md:pb-8">
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
<h1 className="text-2xl font-bold text-card-foreground flex items-center">
                <CreditCardIcon className="size-8 mr-3" />
                Enhanced Checkout
                {isNigerianUser && <GlobeIcon className="size-6 ml-2 text-success" />}
              </h1>
<p className="text-muted-foreground mt-1">
                Complete your order {isNigerianUser ? '(Nigerian Payment System)' : ''}
              </p>
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
                    ? 'border-primary bg-primary text-primary-foreground'
                    : index < ['shipping', 'payment', 'review'].indexOf(currentStep)
                    ? 'border-success bg-success text-success-foreground'
                    : 'border-border bg-card text-muted-foreground'
                )}>
                  <Icon className="size-5" />
                </div>
                <span className={cn(
                  'ml-3 font-medium',
                  currentStep === key || index < ['shipping', 'payment', 'review'].indexOf(currentStep)
                    ? 'text-card-foreground'
                    : 'text-muted-foreground'
                )}>
                  {label}
                </span>
                {index < 2 && (
                  <div className={cn(
                    'w-16 h-0.5 mx-4',
                    index < ['shipping', 'payment', 'review'].indexOf(currentStep)
                      ? 'bg-success'
                      : 'bg-border'
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
<MapPinIcon className="size-6 text-primary mr-3" />
<h2 className="text-xl font-semibold text-card-foreground">Shipping Information</h2>
                  {isNigerianUser && (
                    <Badge variant="outline" className="ml-3">Nigerian Address Format</Badge>
                  )}
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
                    <Label htmlFor="phone">
                      Phone Number * 
                      {isNigerianUser && <span className="text-sm text-muted-foreground ml-1">(e.g., +234XXXXXXXXXX)</span>}
                    </Label>
                    <Input
                      id="phone"
                      placeholder={isNigerianUser ? "+2348123456789" : "Phone number"}
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
                    {isNigerianUser ? (
                      <select
                        id="state"
                        className="w-full p-2 border border-gray-300 rounded-md"
                        value={shippingAddress.state}
                        onChange={(e) => setShippingAddress(prev => ({ ...prev, state: e.target.value }))}
                      >
                        {NIGERIAN_STATES.map(state => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        id="state"
                        value={shippingAddress.state}
                        onChange={(e) => setShippingAddress(prev => ({ ...prev, state: e.target.value }))}
                      />
                    )}
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
                  <RadioGroup value={deliveryOption} onValueChange={(val) => setDeliveryOption(val as DeliveryOption['id'])}>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <RadioGroupItem value="standard" id="standard" />
                      <Label htmlFor="standard" className="flex items-center justify-between w-full cursor-pointer">
                        <div className="flex items-center">
<TruckIcon className="size-5 mr-3 text-primary" />
                          <div>
                            <p className="font-medium">Standard Delivery</p>
<p className="text-sm text-muted-foreground">2-3 business days</p>
                          </div>
                        </div>
                        <span className="font-semibold">₦{isNigerianUser ? '1,000' : '500'}</span>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <RadioGroupItem value="express" id="express" />
                      <Label htmlFor="express" className="flex items-center justify-between w-full cursor-pointer">
                        <div className="flex items-center">
<TruckIcon className="size-5 mr-3 text-highlight" />
                          <div>
                            <p className="font-medium">Express Delivery</p>
<p className="text-sm text-muted-foreground">Same day within {shippingAddress.city}</p>
                          </div>
                        </div>
                        <span className="font-semibold">₦{isNigerianUser ? '2,500' : '1,500'}</span>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <RadioGroupItem value="pickup" id="pickup" />
                      <Label htmlFor="pickup" className="flex items-center justify-between w-full cursor-pointer">
                        <div className="flex items-center">
<MapPinIcon className="size-5 mr-3 text-success" />
                          <div>
                            <p className="font-medium">Store Pickup</p>
<p className="text-sm text-muted-foreground">Ready in 1-2 hours</p>
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
<FileTextIcon className="size-5 text-highlight mt-0.5" />
                        <div>
<p className="font-medium text-highlight">Prescription Required</p>
<p className="text-sm text-highlight mt-1">
                          Please upload valid prescriptions for: {prescriptionItems.map(item => item.product?.name).join(', ')}
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
<span className="text-sm text-card-foreground">{file.name}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removePrescriptionFile(index)}
className="text-destructive hover:text-destructive/90"
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
<CreditCardIcon className="size-6 text-primary mr-3" />
<h2 className="text-xl font-semibold text-card-foreground">Payment Method</h2>
                  {isNigerianUser && (
                    <Badge variant="outline" className="ml-3">Nigerian Gateways Available</Badge>
                  )}
                </div>

                <RadioGroup value={paymentMethod.type} onValueChange={(value) => setPaymentMethod(prev => ({ ...prev, type: value as PaymentMethod['type'] }))}>
                  <div className="space-y-4">
                    {/* Nigerian Payment Gateways (show first for Nigerian users) */}
                    {isNigerianUser && (
                      <div className="flex items-center space-x-2 p-3 border rounded-lg bg-green-50">
                        <RadioGroupItem value="nigerian_gateway" id="nigerian_gateway" />
                        <Label htmlFor="nigerian_gateway" className="flex items-center cursor-pointer">
<GlobeIcon className="size-5 mr-3 text-success" />
                          <span>Nigerian Payment Gateway (Recommended)</span>
                        </Label>
                      </div>
                    )}

                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <RadioGroupItem value="card" id="card" />
                      <Label htmlFor="card" className="flex items-center cursor-pointer">
<CreditCardIcon className="size-5 mr-3 text-primary" />
                        <span>Credit/Debit Card</span>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <RadioGroupItem value="transfer" id="transfer" />
                      <Label htmlFor="transfer" className="flex items-center cursor-pointer">
<ShieldCheckIcon className="size-5 mr-3 text-success" />
                        <span>Bank Transfer</span>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <RadioGroupItem value="cash" id="cash" />
                      <Label htmlFor="cash" className="flex items-center cursor-pointer">
                        <TruckIcon className="size-5 mr-3 text-highlight" />
                        <span>Cash on Delivery</span>
                      </Label>
                    </div>
                  </div>
                </RadioGroup>

                {/* Nigerian Gateway Selection */}
                {paymentMethod.type === 'nigerian_gateway' && (
                  <div className="mt-6">
                    <Label className="text-base font-semibold mb-3 block">Select Payment Gateway</Label>
                    <RadioGroup value={paymentMethod.nigerianGateway} onValueChange={(value) => setPaymentMethod(prev => ({ ...prev, nigerianGateway: value as PaymentMethod['nigerianGateway'] }))}>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2 p-3 border rounded-lg">
                          <RadioGroupItem value="FLUTTERWAVE" id="flutterwave" />
                          <Label htmlFor="flutterwave" className="flex items-center justify-between w-full cursor-pointer">
                            <div>
                              <p className="font-medium">Flutterwave</p>
                              <p className="text-sm text-muted-foreground">Cards, Bank Transfer, USSD</p>
                            </div>
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2 p-3 border rounded-lg">
                          <RadioGroupItem value="PAYSTACK" id="paystack" />
                          <Label htmlFor="paystack" className="flex items-center justify-between w-full cursor-pointer">
                            <div>
                              <p className="font-medium">Paystack</p>
                              <p className="text-sm text-muted-foreground">Cards, Bank Transfer</p>
                            </div>
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2 p-3 border rounded-lg">
                          <RadioGroupItem value="OPAY" id="opay" />
                          <Label htmlFor="opay" className="flex items-center justify-between w-full cursor-pointer">
                            <div>
                              <p className="font-medium">OPay</p>
                              <p className="text-sm text-muted-foreground">Mobile Money, Bank Transfer</p>
                            </div>
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {/* Traditional Card Details */}
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

                {/* Bank Transfer Details */}
                {paymentMethod.type === 'transfer' && (
                  <Alert variant="primary" className="mt-6">
                    <AlertTitle>Bank transfer details</AlertTitle>
                    <AlertDescription>
                      <div className="text-sm space-y-2">
                        <p>Complete your payment using the details below and upload proof of payment.</p>
                        <p><strong>Bank:</strong> {isNigerianUser ? 'Access Bank Nigeria' : 'First Bank Nigeria'}</p>
                        <p><strong>Account Name:</strong> ModuloScript Pharmacy</p>
                        <p><strong>Account Number:</strong> {isNigerianUser ? '0123456789' : '1234567890'}</p>
                        <p><strong>Amount:</strong> ₦{cartSummary.grandTotal.toLocaleString()}</p>
                      </div>
                    </AlertDescription>
                  </Alert>
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
                  <FileTextIcon className="size-6 text-primary mr-3" />
                  <h2 className="text-xl font-semibold text-card-foreground">Order Review</h2>
                </div>

                {/* Order Summary */}
                <div className="space-y-6 mb-6">
                  {cartSummary.items.some(item => item.product?.is_prescription_required || item.product?.isPrescriptionRequired || item.product?.isControlled) && prescriptionFiles.length === 0 && (
                    <Alert variant="warning">
                      <AlertTitle>Prescription required</AlertTitle>
                      <AlertDescription>
                        Your order contains prescription-required items, but no prescription file has been selected. Please go back to the Shipping step to upload your prescription so we can process your order.
                      </AlertDescription>
                    </Alert>
                  )}
                  <div>
                    <h3 className="font-semibold text-card-foreground mb-3">Shipping Address</h3>
                    <div className="p-4 bg-gray-50 rounded-lg text-sm">
                      <p>{shippingAddress.firstName} {shippingAddress.lastName}</p>
                      <p>{shippingAddress.address}</p>
                      <p>{shippingAddress.city}, {shippingAddress.state}</p>
                      <p>{shippingAddress.phone}</p>
                      <p>{shippingAddress.email}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-card-foreground mb-3">Payment Method</h3>
                    <div className="p-4 bg-gray-50 rounded-lg text-sm">
                      <p className="capitalize">
                        {paymentMethod.type === 'nigerian_gateway' 
                          ? `${paymentMethod.nigerianGateway} (Nigerian Gateway)`
                          : paymentMethod.type.replace('_', ' ')
                        }
                      </p>
                      {paymentMethod.type === 'card' && paymentMethod.cardNumber && (
                        <p>**** **** **** {paymentMethod.cardNumber.slice(-4)}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-card-foreground mb-3">Delivery Option</h3>
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
                      onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                    />
                    <Label htmlFor="terms" className="text-sm">
                      I agree to the{' '}
                      <Link href="/terms" className="text-primary hover:underline">
                        Terms and Conditions
                      </Link>
                      {' '}and{' '}
                      <Link href="/privacy" className="text-primary hover:underline">
                        Privacy Policy
                      </Link>
                      {isNigerianUser && (
<span className="text-muted-foreground">
                          {' '}and understand that payments will be processed through Nigerian payment gateways
                        </span>
                      )}
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
<h3 className="font-semibold text-card-foreground mb-4">Order Summary</h3>
                
                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {cartSummary.items.map((item) => (
                    <CartItem
                      key={item.id}
                      item={item}
                      compact={true}
                      // @ts-expect-error - passed strictly for presentation
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
<div className="flex justify-between text-sm text-success">
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

                  {isNigerianUser && (
<div className="flex justify-between text-sm text-success">
                      <span>Gateway Fee</span>
                      <span>Included</span>
                    </div>
                  )}

                  <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span>₦{cartSummary.grandTotal.toLocaleString()}</span>
                  </div>
                </div>

                {isNigerianUser && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
<GlobeIcon className="size-4 text-success mr-2" />
<p className="text-xs text-success">
                        Secure Nigerian payment processing with multiple gateway options
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
        {/* Mobile sticky checkout bar */}
        <div className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/75 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-base font-semibold text-card-foreground">₦{cartSummary.grandTotal.toLocaleString()}</p>
            </div>
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              onClick={currentStep === 'shipping' ? handleShippingNext : currentStep === 'payment' ? handlePaymentNext : handlePlaceOrder}
              disabled={currentStep === 'review' && isProcessing}
            >
              {currentStep === 'shipping' && 'Continue to Payment'}
              {currentStep === 'payment' && 'Review Order'}
              {currentStep === 'review' && (isProcessing ? 'Processing…' : 'Place Order')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
