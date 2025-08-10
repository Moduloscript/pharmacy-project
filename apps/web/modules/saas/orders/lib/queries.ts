import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  OrdersAPI,
  OrderFilters, 
  CreateOrderRequest, 
  UpdateOrderRequest,
  Order,
  OrderStatus,
  PaymentStatus
} from './api';

// Query Keys Factory
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters: OrderFilters, page?: number, pageSize?: number) => 
    [...orderKeys.lists(), { filters, page, pageSize }] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  stats: (dateFrom?: Date, dateTo?: Date, customerId?: string) => 
    [...orderKeys.all, 'stats', { dateFrom, dateTo, customerId }] as const,
  myOrders: () => [...orderKeys.all, 'my'] as const,
  myOrdersList: (filters: OrderFilters, page?: number) => 
    [...orderKeys.myOrders(), { filters, page }] as const,
} as const;

// Orders Queries
export function useOrders(
  filters: OrderFilters = {}, 
  page = 1, 
  pageSize = 20
) {
  return useQuery({
    queryKey: orderKeys.list(filters, page, pageSize),
    queryFn: () => OrdersAPI.getOrders(filters, page, pageSize),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    placeholderData: (previousData) => previousData, // Keep previous data while loading
  });
}

export function useOrder(orderId: string) {
  return useQuery({
    queryKey: orderKeys.detail(orderId),
    queryFn: () => OrdersAPI.getOrder(orderId),
    staleTime: 1 * 60 * 1000, // 1 minute (orders change frequently)
    gcTime: 5 * 60 * 1000,
    enabled: !!orderId,
    retry: (failureCount, error) => {
      // Don't retry on 404s
      if (error.message.includes('not found')) return false;
      return failureCount < 2;
    },
  });
}

export function useMyOrders(filters: OrderFilters = {}, page = 1) {
  return useQuery({
    queryKey: orderKeys.myOrdersList(filters, page),
    queryFn: () => OrdersAPI.getOrders({ ...filters, customerId: 'me' }, page, 10),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function useOrderStats(
  dateFrom?: Date,
  dateTo?: Date, 
  customerId?: string
) {
  return useQuery({
    queryKey: orderKeys.stats(dateFrom, dateTo, customerId),
    queryFn: () => OrdersAPI.getOrderStats(dateFrom, dateTo, customerId),
    staleTime: 5 * 60 * 1000, // 5 minutes for stats
    gcTime: 10 * 60 * 1000,
    retry: 2,
  });
}

// Order Mutations
export function useCreateOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateOrderRequest) => OrdersAPI.createOrder(data),
    onSuccess: (newOrder) => {
      // Add the new order to the cache
      queryClient.setQueryData(
        orderKeys.detail(newOrder.id),
        newOrder
      );
      
      // Invalidate order lists and stats
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.myOrders() });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
    onError: (error) => {
      console.error('Failed to create order:', error);
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ orderId, updates }: { orderId: string; updates: UpdateOrderRequest }) => 
      OrdersAPI.updateOrder(orderId, updates),
    onMutate: async ({ orderId, updates }) => {
      // Cancel outgoing refetches for this order
      await queryClient.cancelQueries({ queryKey: orderKeys.detail(orderId) });

      // Snapshot the previous value
      const previousOrder = queryClient.getQueryData(orderKeys.detail(orderId));

      // Optimistically update the order
      if (previousOrder) {
        queryClient.setQueryData(orderKeys.detail(orderId), (old: Order) => ({
          ...old,
          ...updates,
          updatedAt: new Date(),
        }));
      }

      return { previousOrder };
    },
    onError: (err, { orderId }, context) => {
      // Rollback optimistic update on error
      if (context?.previousOrder) {
        queryClient.setQueryData(orderKeys.detail(orderId), context.previousOrder);
      }
    },
    onSuccess: (updatedOrder, { orderId }) => {
      // Update the order in cache with server response
      queryClient.setQueryData(orderKeys.detail(orderId), updatedOrder);
      
      // Invalidate lists to ensure they're up to date
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.myOrders() });
    },
    onSettled: (data, error, { orderId }) => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason?: string }) => 
      OrdersAPI.cancelOrder(orderId, reason),
    onMutate: async ({ orderId }) => {
      await queryClient.cancelQueries({ queryKey: orderKeys.detail(orderId) });
      const previousOrder = queryClient.getQueryData(orderKeys.detail(orderId));

      // Optimistically update order status
      if (previousOrder) {
        queryClient.setQueryData(orderKeys.detail(orderId), (old: Order) => ({
          ...old,
          status: 'cancelled' as OrderStatus,
          updatedAt: new Date(),
        }));
      }

      return { previousOrder };
    },
    onError: (err, { orderId }, context) => {
      if (context?.previousOrder) {
        queryClient.setQueryData(orderKeys.detail(orderId), context.previousOrder);
      }
    },
    onSuccess: (cancelledOrder, { orderId }) => {
      queryClient.setQueryData(orderKeys.detail(orderId), cancelledOrder);
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.myOrders() });
    },
  });
}

export function useRefundOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ orderId, amount, reason }: { 
      orderId: string; 
      amount?: number; 
      reason?: string; 
    }) => OrdersAPI.refundOrder(orderId, amount, reason),
    onSuccess: (refundedOrder, { orderId }) => {
      queryClient.setQueryData(orderKeys.detail(orderId), refundedOrder);
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.myOrders() });
    },
  });
}

export function useAddTrackingUpdate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      orderId, 
      status, 
      description, 
      location, 
      estimatedDelivery 
    }: {
      orderId: string;
      status: OrderStatus;
      description: string;
      location?: string;
      estimatedDelivery?: Date;
    }) => OrdersAPI.addTrackingUpdate(orderId, status, description, location, estimatedDelivery),
    onSuccess: (updatedOrder, { orderId }) => {
      queryClient.setQueryData(orderKeys.detail(orderId), updatedOrder);
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}

export function useVerifyPrescription() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      orderId, 
      prescriptionId, 
      verified, 
      notes 
    }: {
      orderId: string;
      prescriptionId: string;
      verified: boolean;
      notes?: string;
    }) => OrdersAPI.verifyPrescription(orderId, prescriptionId, verified, notes),
    onSuccess: (updatedOrder, { orderId }) => {
      queryClient.setQueryData(orderKeys.detail(orderId), updatedOrder);
    },
  });
}

// Utility Hooks
export function useGenerateInvoice() {
  return useMutation({
    mutationFn: (orderId: string) => OrdersAPI.generateInvoice(orderId),
    onSuccess: (pdfBlob, orderId) => {
      // Download the PDF
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
  });
}

export function useSendOrderConfirmation() {
  return useMutation({
    mutationFn: (orderId: string) => OrdersAPI.sendOrderConfirmation(orderId),
  });
}

// Prefetch utilities
export function usePrefetchOrder() {
  const queryClient = useQueryClient();
  
  return (orderId: string) => {
    queryClient.prefetchQuery({
      queryKey: orderKeys.detail(orderId),
      queryFn: () => OrdersAPI.getOrder(orderId),
      staleTime: 1 * 60 * 1000,
    });
  };
}

export function usePrefetchOrders() {
  const queryClient = useQueryClient();
  
  return (filters: OrderFilters, page = 1, pageSize = 20) => {
    queryClient.prefetchQuery({
      queryKey: orderKeys.list(filters, page, pageSize),
      queryFn: () => OrdersAPI.getOrders(filters, page, pageSize),
      staleTime: 2 * 60 * 1000,
    });
  };
}

// Cache manipulation utilities
export function useOrderCache() {
  const queryClient = useQueryClient();

  const updateOrderInCache = (orderId: string, updates: Partial<Order>) => {
    queryClient.setQueryData(orderKeys.detail(orderId), (oldData: Order | undefined) => {
      if (!oldData) return oldData;
      
      return {
        ...oldData,
        ...updates,
        updatedAt: new Date(),
      };
    });

    // Also update in any lists that contain this order
    queryClient.setQueriesData(
      { queryKey: orderKeys.lists() },
      (oldData: any) => {
        if (!oldData?.orders) return oldData;
        
        return {
          ...oldData,
          orders: oldData.orders.map((order: Order) =>
            order.id === orderId 
              ? { ...order, ...updates, updatedAt: new Date() }
              : order
          )
        };
      }
    );
  };

  const removeOrderFromCache = (orderId: string) => {
    queryClient.removeQueries({ queryKey: orderKeys.detail(orderId) });
    
    // Remove from lists
    queryClient.setQueriesData(
      { queryKey: orderKeys.lists() },
      (oldData: any) => {
        if (!oldData?.orders) return oldData;
        
        return {
          ...oldData,
          orders: oldData.orders.filter((order: Order) => order.id !== orderId),
          totalCount: oldData.totalCount - 1,
        };
      }
    );
  };

  return {
    updateOrderInCache,
    removeOrderFromCache,
  };
}
