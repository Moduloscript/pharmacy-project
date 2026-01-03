"use client";

import { useMyOrders } from "@saas/orders/lib/queries";
import { Card } from "@ui/components/card";
import { Button } from "@ui/components/button";
import { AlertTriangleIcon, RefreshCwIcon, ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { Order, OrderItem } from "@saas/orders/lib/types";

export function LowStockAlerts() {
  // We'll use order history to simulate "items you might be running low on"
  // Logic: Get items from past orders (excluding the very most recent one if possible, or just all)
  const { data, isLoading } = useMyOrders({ status: ['delivered'] as any }, 1);

  if (isLoading) return null;

  // robustly gather items from orders
  const allOrders = data?.orders || [];
  if (allOrders.length === 0) return null;

  // Flatten items and calculate days ago
  const suggestionMap = new Map<string, { item: OrderItem, daysAgo: number }>();
  
  allOrders.forEach((order: Order) => {
    const daysAgo = Math.floor((new Date().getTime() - new Date(order.createdAt).getTime()) / (1000 * 3600 * 24));
    // Filter reasonable timeframe (e.g., > 7 days ago means might need restock)
    if (daysAgo > 7) {
      (order.items || []).forEach((item) => {
        if (!suggestionMap.has(item.productId)) {
          suggestionMap.set(item.productId, { item, daysAgo });
        }
      });
    }
  });

  // If no "old" orders, maybe show items from oldest available order
  let suggestions = Array.from(suggestionMap.values());
  
  // Fallback if list is empty (e.g. only fresh orders)
  if (suggestions.length === 0 && allOrders.length > 0) {
     const oldestOrder = allOrders[allOrders.length - 1];
     const daysAgo = Math.floor((new Date().getTime() - new Date(oldestOrder.createdAt).getTime()) / (1000 * 3600 * 24));
     suggestions = (oldestOrder.items || []).map(item => ({ item, daysAgo }));
  }

  // Limit to 3 items
  const displayItems = suggestions.slice(0, 3);

  if (displayItems.length === 0) return null;

  return (
    <Card className="border-2 border-black p-0 bg-[#FFD700] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-visible relative group">
      {/* Floating Badge */}
      <div className="absolute -top-3 -right-3 bg-black text-white text-[10px] font-black uppercase px-2 py-1 rotate-3 border border-white z-20 shadow-sm">
        Action Needed
      </div>

      <div className="p-4 border-b-2 border-black bg-[#FFD700] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-black border border-black">
            <AlertTriangleIcon className="h-5 w-5 text-[#FFD700]" strokeWidth={3} />
          </div>
          <h3 className="text-sm font-black uppercase tracking-tighter text-black leading-none">
            Low Stock<br/>Alerts
          </h3>
        </div>
        <div className="h-2 w-2 bg-black rounded-full animate-pulse" />
      </div>
      
      <div className="p-4 bg-white border-t-0 h-full">
        <p className="text-[11px] text-zinc-600 font-bold uppercase mb-4 tracking-tight">
          Restock predicted based on usage:
        </p>

        <div className="space-y-3">
          {displayItems.map(({ item, daysAgo }) => (
            <div key={item.id} className="flex items-center justify-between bg-[#FFFCF7] border-2 border-black p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5">
              <div className="flex flex-col gap-0.5">
                <div className="font-black text-xs uppercase line-clamp-1">{item.name}</div>
                <div className="text-[9px] font-mono text-zinc-500 bg-zinc-100 inline-block px-1 w-fit border border-zinc-200">
                  Ordered {daysAgo} days ago
                </div>
              </div>
              <Button size="sm" className="h-7 text-[10px] font-bold uppercase bg-black text-white hover:bg-[#FF4500] hover:text-white border-none rounded-none transition-colors" asChild>
                <Link href={`/app/products/${item.productId}`}>
                  Restock +
                </Link>
              </Button>
            </div>
          ))}
        </div>

        <Button variant="link" className="w-full text-xs font-black uppercase mt-4 text-black hover:bg-black hover:text-[#FFD700] border border-transparent hover:border-black transition-all p-0 h-8" asChild>
          <Link href="/app/orders" className="flex items-center justify-center gap-2">
            Analyze Usage <ArrowRightIcon className="w-3 h-3" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
