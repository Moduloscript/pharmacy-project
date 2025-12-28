'use client';

import { useState } from 'react';
import { useAtomValue, useAtom } from 'jotai';
import { Button } from '@ui/components/button';
import { Card } from '@ui/components/card';
import { Badge } from '@ui/components/badge';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { Textarea } from '@ui/components/textarea';
import { Alert, AlertDescription, AlertTitle } from '@ui/components/alert';
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
  Upload,
  X,
  AlertCircle
} from 'lucide-react';
import { cn } from '@ui/lib';
import { RadioGroup, RadioGroupItem } from '@ui/components/radio-group';
import { Checkbox } from '@ui/components/checkbox';
import { 
  cartSummaryAtom,
  validateCartAtom,
  selectedDeliveryAtom,
  clearCartAtom,
  cartItemsAtom
} from '../lib/cart-store';
import { CheckoutService, CheckoutData, CheckoutResult } from '../lib/checkout';
import { useCartToast } from '../../shared/hooks/use-toast';
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
  const cartItems = useAtomValue(cartItemsAtom);
  const cartValidation = useAtomValue(validateCartAtom);
  const [selectedDelivery, setSelectedDelivery] = useAtom(selectedDeliveryAtom);
  const [, clearCart] = useAtom(clearCartAtom);
  const cartToast = useCartToast();

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
  const [uploadProgress, setUploadProgress] = useState<Array<{
    file: File;
    progress: number;
    status: 'uploading' | 'success' | 'error';
    error?: string;
  }>>([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

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
      cartToast.showError('Please agree to the terms and conditions');
      return;
    }

    if (!cartValidation.isValid) {
      cartToast.showError('Please fix cart issues: ' + cartValidation.errors.join(', '));
      return;
    }

    setIsProcessing(true);

    try {
      // Prepare checkout data
      const checkoutData: CheckoutData = {
        shippingAddress,
        deliveryMethod: selectedDelivery,
        paymentMethod: paymentMethod.type,
        paymentDetails: paymentMethod.type === 'card' ? {
          cardNumber: paymentMethod.cardNumber,
          expiryDate: paymentMethod.expiryDate,
          cvv: paymentMethod.cvv
        } : undefined,
        customerNotes: shippingAddress.instructions,
        prescriptionFiles: prescriptionFiles.length > 0 ? prescriptionFiles : undefined
      };

      // Process checkout (without prescription files - they'll be uploaded separately)
      const checkoutDataWithoutFiles = {
        ...checkoutData,
        prescriptionFiles: undefined // Don't send files with order creation
      };
      
      const result: CheckoutResult = await CheckoutService.processCheckout(
        cartItems,
        checkoutDataWithoutFiles,
        cartSummary
      );

      if (result.success && result.order) {
        setOrderId(result.order.id);
        
        // Handle prescription upload if needed
        if (prescriptionFiles.length > 0 && prescriptionItems.length > 0) {
          // Store order ID for prescription upload
          sessionStorage.setItem('pendingPrescriptionOrderId', result.order.id);
          sessionStorage.setItem('pendingPrescriptionFiles', JSON.stringify(
            prescriptionFiles.map(f => ({ name: f.name, size: f.size }))
          ));
        }
        
        setOrderComplete(true);
        clearCart('order_completed');
        cartToast.showSuccess('Order placed successfully!');

        if (onOrderComplete) {
          onOrderComplete(result.order.id);
        }

        // Redirect if needed (for payment)
        if (result.redirectUrl && paymentMethod.type !== 'cash') {
          // For non-cash payments, we might want to redirect
          // window.location.href = result.redirectUrl;
        }
      } else {
        cartToast.showError(result.error || 'Failed to place order');
      }
    } catch (error) {
      cartToast.showError('Failed to place order. Please try again.');
      console.error('Order placement failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle prescription file upload with progress tracking
  const handlePrescriptionUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setUploadingFiles(true);
    const newUploadProgress: typeof uploadProgress = [];
    const newPreviewUrls: string[] = [...filePreviewUrls];

    // Add files to upload progress
    for (const file of files) {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        cartToast.showError(`File ${file.name} exceeds 10MB limit`);
        continue;
      }

      // Generate preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const url = e.target?.result as string;
          newPreviewUrls.push(url);
          setFilePreviewUrls([...newPreviewUrls]);
        };
        reader.readAsDataURL(file);
      } else {
        newPreviewUrls.push('');
      }

      newUploadProgress.push({
        file,
        progress: 0,
        status: 'uploading'
      });
    }

    setUploadProgress(newUploadProgress);
    
    // Simulate upload progress for now
    // In actual implementation, this would track real upload progress
    for (let i = 0; i < newUploadProgress.length; i++) {
      const progressItem = newUploadProgress[i];
      
      // Simulate progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          const updated = [...prev];
          if (updated[i] && updated[i].status === 'uploading') {
            updated[i].progress = Math.min(updated[i].progress + 10, 100);
            if (updated[i].progress === 100) {
              updated[i].status = 'success';
              clearInterval(interval);
            }
          }
          return updated;
        });
      }, 200);
    }

    // Add files to prescription files list
    setPrescriptionFiles(prev => [...prev, ...files]);
    
    // Clear upload progress after success
    setTimeout(() => {
      setUploadProgress([]);
      setUploadingFiles(false);
    }, 2000);
    
    cartToast.showSuccess('Prescriptions will be uploaded after order is placed');
  };

  const removePrescriptionFile = (index: number) => {
    setPrescriptionFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Check if cart has prescription items
  const prescriptionItems = cartItems.filter(item => item.product?.requires_prescription || item.product?.isPrescriptionRequired);

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
    // Check if prescriptions need to be uploaded
    const hasPendingPrescriptions = sessionStorage.getItem('pendingPrescriptionOrderId') === orderId;
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
<CheckCircleIcon className="size-16 text-success mx-auto mb-4" />
<h2 className="text-xl font-semibold text-card-foreground mb-2">Order Placed Successfully!</h2>
<p className="text-muted-foreground mb-4">
            Your order {orderId} has been placed and is being processed.
          </p>
          
          {hasPendingPrescriptions && (
            <Alert className="mb-4 text-left">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your order contains items that require prescriptions. Please upload them to complete your order.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            {hasPendingPrescriptions ? (
              <Link href={`/app/orders/${orderId}#prescription-upload`}>
                <Button className="w-full">Upload Prescriptions</Button>
              </Link>
            ) : (
              <Link href="/app/orders">
                <Button className="w-full">View Orders</Button>
              </Link>
            )}
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
                Checkout
              </h1>
<p className="text-muted-foreground mt-1">Complete your order</p>
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
                  <RadioGroup value={selectedDelivery} onValueChange={(val: string) => setSelectedDelivery(val as any)}>
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
                        <span className="font-semibold">₦500</span>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <RadioGroupItem value="express" id="express" />
                      <Label htmlFor="express" className="flex items-center justify-between w-full cursor-pointer">
                        <div className="flex items-center">
<TruckIcon className="size-5 mr-3 text-highlight" />
                          <div>
                            <p className="font-medium">Express Delivery</p>
<p className="text-sm text-muted-foreground">Same day within Benin City</p>
                          </div>
                        </div>
                        <span className="font-semibold">₦1,500</span>
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

                    {/* Upload Area */}
                    <div
                      onClick={() => document.getElementById('prescription-input')?.click()}
                      className={cn(
                        "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
                        "hover:border-gray-400 bg-gray-50/50",
                        uploadingFiles && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <Input
                        id="prescription-input"
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handlePrescriptionUpload}
                        className="hidden"
                        disabled={uploadingFiles}
                      />
                      <Upload className="mx-auto h-10 w-10 text-gray-400 mb-3" />
                      <p className="text-sm font-medium text-gray-700">
                        Click to upload prescriptions
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PDF, JPEG, PNG (max 10MB)
                      </p>
                    </div>

                    {/* Upload Progress */}
                    {uploadProgress.length > 0 && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="text-sm font-medium mb-3">Uploading Files</h4>
                        <div className="space-y-3">
                          {uploadProgress.map((item, index) => (
                            <div key={index} className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="truncate flex-1 mr-2">{item.file.name}</span>
                                <span className="text-gray-500">
                                  {(item.file.size / 1024 / 1024).toFixed(2)} MB
                                </span>
                              </div>
                              <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="absolute inset-y-0 left-0 bg-primary transition-all duration-300"
                                  style={{ width: `${item.progress}%` }}
                                />
                              </div>
                              {item.status === 'error' && (
                                <p className="text-xs text-red-600">{item.error}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Uploaded Files */}
                    {prescriptionFiles.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <h4 className="text-sm font-medium mb-2">Uploaded Files</h4>
                        {prescriptionFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                            <div className="flex items-center space-x-3 flex-1">
                              {file.type.startsWith('image/') && filePreviewUrls[index] ? (
                                <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0">
                                  <img 
                                    src={filePreviewUrls[index]} 
                                    alt={file.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <FileTextIcon className="size-8 text-gray-400 flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{file.name}</p>
                                <p className="text-xs text-gray-500">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removePrescriptionFile(index)}
                              className="text-destructive hover:text-destructive/90"
                            >
                              <X className="size-4" />
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
                </div>

                <RadioGroup value={paymentMethod.type} onValueChange={(value: string) => setPaymentMethod(prev => ({ ...prev, type: value as 'card' | 'transfer' | 'cash' }))}>
                  <div className="space-y-4">
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
                  <Alert variant="primary" className="mt-6">
                    <AlertTitle>Bank transfer details</AlertTitle>
                    <AlertDescription>
                      <div className="text-sm space-y-2">
                        <p>Complete your payment using the details below and upload proof of payment.</p>
                        <p><strong>Bank:</strong> First Bank Nigeria</p>
                        <p><strong>Account Name:</strong> ModuloScript Pharmacy</p>
                        <p><strong>Account Number:</strong> 1234567890</p>
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
                  {prescriptionItems.length > 0 && prescriptionFiles.length === 0 && (
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
                      <p className="capitalize">{paymentMethod.type.replace('_', ' ')}</p>
                      {paymentMethod.type === 'card' && paymentMethod.cardNumber && (
                        <p>**** **** **** {paymentMethod.cardNumber.slice(-4)}</p>
                      )}
                    </div>
                  </div>

                  <div>
<h3 className="font-semibold text-card-foreground mb-3">Delivery Option</h3>
                    <div className="p-4 bg-gray-50 rounded-lg text-sm">
                      <p className="capitalize">{selectedDelivery.replace('_', ' ')} Delivery</p>
<p className="text-muted-foreground mt-1">
                        Estimated: {CheckoutService.estimateDeliveryDate(selectedDelivery, shippingAddress.city).toLocaleDateString()}
                      </p>
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

                  <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span>₦{cartSummary.grandTotal.toLocaleString()}</span>
                  </div>
                </div>
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
              disabled={currentStep === 'review' && (!agreedToTerms || isProcessing)}
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
