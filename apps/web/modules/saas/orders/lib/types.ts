export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus = 
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partial';

export type DeliveryMethod = 'standard' | 'express' | 'pickup';

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  image: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: string;
  requiresPrescription: boolean;
  prescriptionUploaded?: boolean;
  wholesalePrice?: number;
  retailPrice: number;
  sku: string;
}

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode?: string;
  instructions?: string;
}

export interface PaymentInfo {
  method: 'card' | 'transfer' | 'cash';
  status: PaymentStatus;
  transactionId?: string;
  cardLast4?: string;
  bankName?: string;
  paidAt?: Date;
  failureReason?: string;
}

export interface OrderTracking {
  status: OrderStatus;
  updatedAt: Date;
  location?: string;
  description: string;
  estimatedDelivery?: Date;
}

export interface PrescriptionFile {
  id: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: Date;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  
  // Order Items - support both formats for backward compatibility
  items?: OrderItem[];
  itemsCount: number;
  
  // Pricing
  subtotal: number;
  discount: number;
  couponCode?: string;
  couponDiscount: number;
  bulkDiscount: number;
  deliveryFee: number;
  tax: number;
  grandTotal: number;
  
  // Status & Payment
  status: OrderStatus;
  paymentInfo: PaymentInfo;
  
  // Shipping
  shippingAddress: ShippingAddress;
  deliveryMethod: DeliveryMethod;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  
  // Tracking
  tracking: OrderTracking[];
  
  // Prescriptions
  prescriptionFiles: PrescriptionFile[];
  prescriptionRequired: boolean;
  prescriptionVerified: boolean;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Notes
  customerNotes?: string;
  adminNotes?: string;
}

export interface OrderFilters {
  status?: OrderStatus[];
  paymentStatus?: PaymentStatus[];
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  customerId?: string;
  deliveryMethod?: DeliveryMethod[];
  prescriptionRequired?: boolean;
  minAmount?: number;
  maxAmount?: number;
}

export interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  activeOrders: number;
  thisMonthOrders: number;
  totalSavings: number;
  pendingOrders: number;
  processingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  prescriptionOrders?: number; // Optional, may not be provided by all endpoints
  statusBreakdown: Record<string, number>; // Changed to string for lowercase status keys
  paymentStatusBreakdown: Record<PaymentStatus, number>;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    orders: number;
  }>;
}

export interface CreateOrderRequest {
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  shippingAddress: ShippingAddress;
  deliveryMethod: DeliveryMethod;
  paymentMethod: 'card' | 'transfer' | 'cash';
  couponCode?: string;
  customerNotes?: string;
  prescriptionFiles?: File[];
}

export interface UpdateOrderRequest {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  tracking?: Omit<OrderTracking, 'updatedAt'>;
  adminNotes?: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
}

export interface OrderSearchResult {
  orders: Order[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  stats: OrderStats;
}
