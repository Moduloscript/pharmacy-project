import { 
  Order, 
  OrderFilters, 
  OrderSearchResult, 
  CreateOrderRequest, 
  UpdateOrderRequest,
  OrderStats,
  OrderStatus,
  PaymentStatus
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export class OrdersAPI {
  /**
   * Get orders with filtering and pagination
   */
  static async getOrders(
    filters?: OrderFilters,
    page = 1,
    pageSize = 20
  ): Promise<OrderSearchResult> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });

    if (filters) {
      if (filters.status?.length) {
        params.append('status', filters.status.join(','));
      }
      if (filters.paymentStatus?.length) {
        params.append('paymentStatus', filters.paymentStatus.join(','));
      }
      if (filters.search) {
        params.append('search', filters.search);
      }
      if (filters.customerId) {
        params.append('customerId', filters.customerId);
      }
      if (filters.dateFrom) {
        params.append('dateFrom', filters.dateFrom.toISOString());
      }
      if (filters.dateTo) {
        params.append('dateTo', filters.dateTo.toISOString());
      }
      if (filters.deliveryMethod?.length) {
        params.append('deliveryMethod', filters.deliveryMethod.join(','));
      }
      if (filters.prescriptionRequired !== undefined) {
        params.append('prescriptionRequired', filters.prescriptionRequired.toString());
      }
      if (filters.minAmount !== undefined) {
        params.append('minAmount', filters.minAmount.toString());
      }
      if (filters.maxAmount !== undefined) {
        params.append('maxAmount', filters.maxAmount.toString());
      }
    }

    const response = await fetch(`${API_BASE}/orders?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch orders: ${response.statusText}`);
    }
    
    const data = await response.json();
    return {
      ...data,
      orders: data.orders.map((order: any) => ({
        ...order,
        itemsCount: order.itemsCount || order.items?.length || 0,
        createdAt: new Date(order.createdAt),
        updatedAt: new Date(order.updatedAt),
        estimatedDelivery: order.estimatedDelivery ? new Date(order.estimatedDelivery) : undefined,
        actualDelivery: order.actualDelivery ? new Date(order.actualDelivery) : undefined,
        paymentInfo: {
          ...order.paymentInfo,
          paidAt: order.paymentInfo.paidAt ? new Date(order.paymentInfo.paidAt) : undefined,
        },
        tracking: order.tracking?.map((t: any) => ({
          ...t,
          updatedAt: new Date(t.updatedAt),
          estimatedDelivery: t.estimatedDelivery ? new Date(t.estimatedDelivery) : undefined,
        })) || [],
        prescriptionFiles: order.prescriptionFiles?.map((f: any) => ({
          ...f,
          uploadedAt: new Date(f.uploadedAt),
          verifiedAt: f.verifiedAt ? new Date(f.verifiedAt) : undefined,
        })) || [],
      })),
    };
  }

  /**
   * Get a single order by ID
   */
  static async getOrder(orderId: string): Promise<Order> {
    const response = await fetch(`${API_BASE}/orders/${orderId}`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Order not found');
      }
      throw new Error(`Failed to fetch order: ${response.statusText}`);
    }
    
    const order = await response.json();
    return {
      ...order,
      itemsCount: order.itemsCount || order.items?.length || 0,
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(order.updatedAt),
      estimatedDelivery: order.estimatedDelivery ? new Date(order.estimatedDelivery) : undefined,
      actualDelivery: order.actualDelivery ? new Date(order.actualDelivery) : undefined,
      paymentInfo: {
        ...order.paymentInfo,
        paidAt: order.paymentInfo.paidAt ? new Date(order.paymentInfo.paidAt) : undefined,
      },
      tracking: order.tracking?.map((t: any) => ({
        ...t,
        updatedAt: new Date(t.updatedAt),
        estimatedDelivery: t.estimatedDelivery ? new Date(t.estimatedDelivery) : undefined,
      })) || [],
      prescriptionFiles: order.prescriptionFiles?.map((f: any) => ({
        ...f,
        uploadedAt: new Date(f.uploadedAt),
        verifiedAt: f.verifiedAt ? new Date(f.verifiedAt) : undefined,
      })) || [],
    };
  }

  /**
   * Create a new order
   */
  static async createOrder(orderData: CreateOrderRequest): Promise<Order> {
    const formData = new FormData();
    
    // Add order data
    formData.append('orderData', JSON.stringify({
      items: orderData.items,
      shippingAddress: orderData.shippingAddress,
      deliveryMethod: orderData.deliveryMethod,
      paymentMethod: orderData.paymentMethod,
      couponCode: orderData.couponCode,
      customerNotes: orderData.customerNotes,
    }));

    // Add prescription files
    if (orderData.prescriptionFiles?.length) {
      orderData.prescriptionFiles.forEach((file, index) => {
        formData.append(`prescriptions[${index}]`, file);
      });
    }

    const response = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to create order' }));
      throw new Error(error.message || 'Failed to create order');
    }

    const order = await response.json();
    return {
      ...order,
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(order.updatedAt),
      estimatedDelivery: order.estimatedDelivery ? new Date(order.estimatedDelivery) : undefined,
      paymentInfo: {
        ...order.paymentInfo,
        paidAt: order.paymentInfo.paidAt ? new Date(order.paymentInfo.paidAt) : undefined,
      },
      tracking: order.tracking.map((t: any) => ({
        ...t,
        updatedAt: new Date(t.updatedAt),
        estimatedDelivery: t.estimatedDelivery ? new Date(t.estimatedDelivery) : undefined,
      })),
      prescriptionFiles: order.prescriptionFiles.map((f: any) => ({
        ...f,
        uploadedAt: new Date(f.uploadedAt),
        verifiedAt: f.verifiedAt ? new Date(f.verifiedAt) : undefined,
      })),
    };
  }

  /**
   * Update an order (admin only)
   */
  static async updateOrder(orderId: string, updates: UpdateOrderRequest): Promise<Order> {
    const response = await fetch(`${API_BASE}/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to update order' }));
      throw new Error(error.message || 'Failed to update order');
    }

    const order = await response.json();
    return {
      ...order,
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(order.updatedAt),
      estimatedDelivery: order.estimatedDelivery ? new Date(order.estimatedDelivery) : undefined,
      actualDelivery: order.actualDelivery ? new Date(order.actualDelivery) : undefined,
      paymentInfo: {
        ...order.paymentInfo,
        paidAt: order.paymentInfo.paidAt ? new Date(order.paymentInfo.paidAt) : undefined,
      },
      tracking: order.tracking.map((t: any) => ({
        ...t,
        updatedAt: new Date(t.updatedAt),
        estimatedDelivery: t.estimatedDelivery ? new Date(t.estimatedDelivery) : undefined,
      })),
      prescriptionFiles: order.prescriptionFiles.map((f: any) => ({
        ...f,
        uploadedAt: new Date(f.uploadedAt),
        verifiedAt: f.verifiedAt ? new Date(f.verifiedAt) : undefined,
      })),
    };
  }

  /**
   * Cancel an order
   */
  static async cancelOrder(orderId: string, reason?: string): Promise<Order> {
    const response = await fetch(`${API_BASE}/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to cancel order' }));
      throw new Error(error.message || 'Failed to cancel order');
    }

    return this.getOrder(orderId);
  }

  /**
   * Process refund for an order
   */
  static async refundOrder(orderId: string, amount?: number, reason?: string): Promise<Order> {
    const response = await fetch(`${API_BASE}/orders/${orderId}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount, reason }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to process refund' }));
      throw new Error(error.message || 'Failed to process refund');
    }

    return this.getOrder(orderId);
  }

  /**
   * Add tracking update to an order
   */
  static async addTrackingUpdate(
    orderId: string, 
    status: OrderStatus, 
    description: string,
    location?: string,
    estimatedDelivery?: Date
  ): Promise<Order> {
    const response = await fetch(`${API_BASE}/orders/${orderId}/tracking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status,
        description,
        location,
        estimatedDelivery: estimatedDelivery?.toISOString(),
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to add tracking update' }));
      throw new Error(error.message || 'Failed to add tracking update');
    }

    return this.getOrder(orderId);
  }

  /**
   * Verify prescription files
   */
  static async verifyPrescription(
    orderId: string, 
    prescriptionId: string, 
    verified: boolean,
    notes?: string
  ): Promise<Order> {
    const response = await fetch(`${API_BASE}/orders/${orderId}/prescriptions/${prescriptionId}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ verified, notes }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to verify prescription' }));
      throw new Error(error.message || 'Failed to verify prescription');
    }

    return this.getOrder(orderId);
  }

  /**
   * Get order statistics
   */
  static async getOrderStats(
    dateFrom?: Date,
    dateTo?: Date,
    customerId?: string
  ): Promise<OrderStats> {
    const params = new URLSearchParams();
    
    if (dateFrom) {
      params.append('dateFrom', dateFrom.toISOString());
    }
    if (dateTo) {
      params.append('dateTo', dateTo.toISOString());
    }
    if (customerId) {
      params.append('customerId', customerId);
    }

    const response = await fetch(`${API_BASE}/orders/stats?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch order stats: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Handle the success/data response format from the backend
    if (result.success && result.data) {
      return result.data;
    } else if (result.error) {
      throw new Error(result.error.message || 'Failed to fetch order statistics');
    }
    
    return result; // Fallback for direct data response
  }

  /**
   * Generate order invoice PDF
   */
  static async generateInvoice(orderId: string): Promise<Blob> {
    const response = await fetch(`${API_BASE}/orders/${orderId}/invoice`);
    if (!response.ok) {
      throw new Error(`Failed to generate invoice: ${response.statusText}`);
    }
    
    return response.blob();
  }

  /**
   * Send order confirmation email
   */
  static async sendOrderConfirmation(orderId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/orders/${orderId}/send-confirmation`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to send confirmation' }));
      throw new Error(error.message || 'Failed to send confirmation');
    }
  }
}

// Utility functions
export const OrderUtils = {
  /**
   * Get status badge color
   */
  getStatusColor(status: OrderStatus): string {
    const colors: Record<OrderStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-purple-100 text-purple-800',
      shipped: 'bg-orange-100 text-orange-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  },

  /**
   * Get payment status color
   */
  getPaymentStatusColor(status: PaymentStatus): string {
    const colors: Record<PaymentStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800',
      partial: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  },

  /**
   * Format currency
   */
  formatPrice(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  },

  /**
   * Get order status progression
   */
  getStatusProgression(currentStatus: OrderStatus): Array<{ status: OrderStatus; completed: boolean }> {
    const statusFlow: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
    const currentIndex = statusFlow.indexOf(currentStatus);
    
    return statusFlow.map((status, index) => ({
      status,
      completed: index <= currentIndex,
    }));
  },

  /**
   * Calculate order metrics
   */
  calculateOrderMetrics(orders: Order[]): {
    totalRevenue: number;
    averageOrderValue: number;
    totalItems: number;
    prescriptionOrders: number;
  } {
    const totalRevenue = orders.reduce((sum, order) => sum + order.grandTotal, 0);
    const totalItems = orders.reduce((sum, order) => sum + order.itemsCount, 0);
    const prescriptionOrders = orders.filter(order => order.prescriptionRequired).length;
    
    return {
      totalRevenue,
      averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
      totalItems,
      prescriptionOrders,
    };
  },

  /**
   * Check if order can be cancelled
   */
  canBeCancelled(order: Order): boolean {
    return ['pending', 'confirmed'].includes(order.status);
  },

  /**
   * Check if order can be refunded
   */
  canBeRefunded(order: Order): boolean {
    return ['delivered'].includes(order.status) && order.paymentInfo.status === 'paid';
  },

  /**
   * Get estimated delivery date
   */
  getEstimatedDelivery(order: Order): Date | null {
    if (order.estimatedDelivery) {
      return order.estimatedDelivery;
    }

    // Calculate based on delivery method and order date
    const baseDate = order.createdAt;
    switch (order.deliveryMethod) {
      case 'express':
        return new Date(baseDate.getTime() + 24 * 60 * 60 * 1000); // 1 day
      case 'pickup':
        return new Date(baseDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours
      case 'standard':
      default:
        return new Date(baseDate.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days
    }
  },
};
