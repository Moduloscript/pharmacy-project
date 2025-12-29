"use client";

import { useMyOrders } from "@saas/orders/lib/queries";
import { addToCartWithActivityAtom } from "@saas/cart/lib/cart-store";
import { productsAPI } from "@saas/products/lib/api";
import { useSetAtom } from "jotai";
import { Button } from "@ui/components/button";
import { RotateCwIcon, ShoppingBagIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Order, OrderItem } from "@saas/orders/lib/types";

export function QuickReorderPanel() {
  const { data, isLoading } = useMyOrders({ status: ['delivered', 'dispatched', 'processing', 'ready'] as any }, 1);
  const addToCart = useSetAtom(addToCartWithActivityAtom);
  const [addingId, setAddingId] = useState<string | null>(null);

  // Extract frequently ordered items
  const recentItems = data?.orders
    ?.flatMap((order: Order) => order.items || [])
    .filter((item: OrderItem, index: number, self: OrderItem[]) => 
      // Deduplicate by product ID
      index === self.findIndex((t: OrderItem) => t.productId === item.productId)
    )
    .slice(0, 4) || [];

  const handleReorder = async (item: OrderItem) => {
    setAddingId(item.productId);
    try {
      // Fetch fresh product data to ensure price/stock is current
      const { product } = await productsAPI.getProduct(item.productId);
      
      addToCart({
        product,
        quantity: 1,
      });
      toast.success(`${product.name} added to cart`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to add to cart. Product might be unavailable.");
    } finally {
      setAddingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 mb-12">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 bg-gray-100 border-2 border-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  if (recentItems.length === 0) {
    return (
      <div className="mb-12">
        <div className="flex items-end justify-between mb-6 pb-4 border-b-4 border-black dark:border-white">
          <h2 className="text-2xl font-display font-black uppercase tracking-tighter text-black dark:text-white flex items-center gap-3">
            <RotateCwIcon className="h-6 w-6 text-[#FF4500]" />
            Quick Reorder
          </h2>
        </div>
        <div className="bg-zinc-50 border-2 border-dashed border-zinc-300 p-8 text-center">
          <ShoppingBagIcon className="h-12 w-12 mx-auto text-zinc-300 mb-4" />
          <h3 className="font-bold text-lg text-zinc-600 mb-2">No Previous Orders</h3>
          <p className="text-sm text-zinc-500 mb-4">Once you make your first purchase, your items will appear here for quick reordering.</p>
          <Button asChild className="bg-black hover:bg-[#8B83F6] text-white font-bold uppercase text-xs">
            <Link href="/app/products">Browse Products</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-12">
      <div className="flex items-end justify-between mb-6 pb-4 border-b-4 border-black dark:border-white">
        <h2 className="text-2xl font-display font-black uppercase tracking-tighter text-black dark:text-white flex items-center gap-3">
          <RotateCwIcon className="h-6 w-6 text-[#FF4500]" />
          Quick Reorder
        </h2>
        <Link 
          href="/app/orders" 
          className="text-xs font-bold uppercase border-b-2 border-black dark:border-white dark:text-white hover:bg-black hover:text-white transition-all px-1 mb-1"
        >
          View All Orders &rarr;
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {recentItems.map((item: OrderItem) => (
          <div 
            key={item.id}
            className="group flex flex-col justify-between bg-white border-2 border-black p-5 hover:shadow-hard transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <ShoppingBagIcon className="w-12 h-12" />
            </div>

            <div className="space-y-3 z-10">
              <div>
                <h4 className="font-black text-sm uppercase leading-tight line-clamp-2 min-h-[2.5em] group-hover:underline decoration-2 underline-offset-2">
                  {item.name}
                </h4>
                <p className="font-mono text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">
                  Last Qty: {item.quantity} units
                </p>
              </div>
              
              <div className="font-mono text-lg font-bold text-[#FF4500]">
                ₦{(item.unitPrice).toLocaleString()}
              </div>
            </div>

            <Button 
              onClick={() => handleReorder(item)}
              disabled={addingId === item.productId}
              className="w-full mt-4 bg-black hover:bg-[#8B83F6] text-white border-2 border-transparent hover:border-black font-bold uppercase text-xs tracking-wider rounded-none h-10 transition-all"
            >
              {addingId === item.productId ? (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RotateCwIcon className="h-3 w-3 mr-2" />
                  Reorder
                </>
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
