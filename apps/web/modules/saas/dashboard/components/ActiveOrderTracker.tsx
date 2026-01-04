"use client";

import { useMyOrders } from "@saas/orders/lib/queries";
import { Card } from "@ui/components/card";
import { Button } from "@ui/components/button";
import { PackageIcon, TruckIcon, CheckCircleIcon, ClockIcon, MapPinIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@ui/lib";
import { OrderStatus } from "@saas/orders/lib/types";

export function ActiveOrderTracker() {
  // Fetch latest active order
  const { data, isLoading } = useMyOrders({ 
    status: ['received', 'processing', 'ready', 'dispatched', 'RECEIVED', 'PROCESSING', 'READY', 'DISPATCHED'] as any
  }, 1);

  // Debug logging for missing orders
  console.log('[ActiveOrderTracker] Debug:', {
    isLoading,
    ordersLength: data?.orders?.length,
    orders: data?.orders,
    firstOrder: data?.orders?.[0],
    rawData: data
  });

  const activeOrder = data?.orders?.[0];

  if (isLoading) return <div className="h-48 bg-gray-100 animate-pulse border-2 border-black" />;
  
  if (!activeOrder) {
    return (
      <Card className="border-2 border-black p-6 relative overflow-hidden bg-white shadow-hard mb-8">
        <div className="text-center py-4">
          <TruckIcon className="h-12 w-12 mx-auto text-zinc-300 mb-4" />
          <h3 className="font-bold text-lg text-zinc-600 mb-2">No Active Orders</h3>
          <p className="text-sm text-zinc-500 mb-4">You don't have any orders in progress right now.</p>
          <Button asChild className="bg-[#FF4500] hover:bg-[#ff571a] text-white border-2 border-black font-bold uppercase text-xs">
            <Link href="/app/products">Start Shopping</Link>
          </Button>
        </div>
      </Card>
    );
  }

  const steps = [
    { id: 'received', label: 'Placed', icon: ClockIcon },
    { id: 'processing', label: 'Processing', icon: CheckCircleIcon },
    { id: 'ready', label: 'Packed', icon: PackageIcon },
    { id: 'dispatched', label: 'Shipped', icon: TruckIcon },
    { id: 'delivered', label: 'Delivered', icon: MapPinIcon },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === activeOrder.status);
  const progress = Math.max(5, (currentStepIndex / (steps.length - 1)) * 100);

  const orderIdRaw = activeOrder.orderNumber || activeOrder.id.slice(0, 8).toUpperCase();
  const orderIdUnique = orderIdRaw.includes('-') ? orderIdRaw.split('-').pop() : orderIdRaw;
  const orderIdPrefix = orderIdRaw.includes('-') ? orderIdRaw.slice(0, orderIdRaw.lastIndexOf('-') + 1) : '';

  return (
    <Card className="border-3 border-black p-6 relative overflow-hidden bg-[#5FB574] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-10 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block w-3 h-3 rounded-full bg-[#FFD700] animate-pulse border-2 border-black" />
            <span className="text-xs font-black uppercase tracking-widest text-black">Active Order</span>
          </div>
          <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-black truncate max-w-full">
            {orderIdPrefix}{orderIdUnique}
          </h3>
          <p className="text-sm font-black text-black mt-2 flex items-center gap-2">
            <ClockIcon className="w-4 h-4 text-black" />
            <span className="text-black">ETA:</span> 
            <span className="text-black font-black bg-white px-3 py-1 rounded-sm border-2 border-black">Today, 4:30 PM</span>
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            className="border-3 border-black bg-black text-white font-black uppercase text-xs hover:bg-[#FF4500] hover:text-white transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]" 
            asChild
          >
            <Link href={`/app/orders/${activeOrder.id}`}>
              Track Shipment <TruckIcon className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative mb-4 px-2">
        {/* Track Line */}
        <div className="absolute top-1/2 left-0 w-full h-3 bg-white -translate-y-1/2 rounded-full border-3 border-black" />
        
        {/* Active Progress */}
        <div 
          className="absolute top-1/2 left-0 h-3 bg-[#FFD700] -translate-y-1/2 transition-all duration-1000 rounded-full border-3 border-black shadow-sm" 
          style={{ width: `${progress}%` }} 
        />
        
        <div className="relative flex justify-between">
          {steps.map((step, i) => {
            const isCompleted = i < currentStepIndex;
            const isCurrent = i === currentStepIndex;
            
            return (
              <div key={step.id} className="flex flex-col items-center gap-3 group cursor-default">
                <div className={cn(
                  "w-12 h-12 rounded-full border-3 flex items-center justify-center transition-all duration-300 z-10",
                  isCompleted ? "bg-[#FFD700] border-black text-black mb-1 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]" : "bg-white border-black text-black",
                  isCurrent && "bg-black border-black text-white scale-[1.3] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mb-2"
                )}>
                  <step.icon className={cn("transition-all", isCurrent ? "w-6 h-6" : "w-5 h-5")} />
                </div>
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-wider hidden md:block transition-all duration-300 px-2 py-1 rounded-full border-2",
                  isCompleted ? "text-black bg-[#FFD700] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "text-black bg-transparent border-transparent opacity-60",
                  isCurrent && "text-black bg-white border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transform -translate-y-1 opacity-100"
                )}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
