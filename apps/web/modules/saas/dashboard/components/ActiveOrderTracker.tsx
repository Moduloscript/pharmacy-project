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
    status: ['received', 'processing', 'ready', 'dispatched'] as any
  }, 1);

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

  return (
    <Card className="border-2 border-black p-6 relative overflow-hidden bg-white shadow-hard mb-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Active Order</span>
          </div>
          <h3 className="text-2xl font-black uppercase tracking-tight">
            Order #{activeOrder.orderNumber || activeOrder.id.slice(0, 8)}
          </h3>
          <p className="text-sm font-medium text-zinc-600">
            ETA: <span className="text-black font-bold">Today, 4:30 PM</span>
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="border-2 border-black font-bold uppercase text-xs" asChild>
            <Link href={`/app/orders/${activeOrder.id}`}>Track Shipment</Link>
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative mb-8">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-zinc-200 -translate-y-1/2" />
        <div 
          className="absolute top-1/2 left-0 h-1 bg-[#FF4500] -translate-y-1/2 transition-all duration-1000" 
          style={{ width: `${progress}%` }} 
        />
        
        <div className="relative flex justify-between">
          {steps.map((step, i) => {
            const isActive = i <= currentStepIndex;
            const isCurrent = i === currentStepIndex;
            
            return (
              <div key={step.id} className="flex flex-col items-center gap-2">
                <div className={cn(
                  "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all bg-white z-10",
                  isActive ? "border-[#FF4500] text-[#FF4500]" : "border-zinc-300 text-zinc-300",
                  isCurrent && "bg-[#FF4500] text-white scale-110 shadow-lg"
                )}>
                  <step.icon className="w-4 h-4" />
                </div>
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wider hidden md:block",
                  isActive ? "text-black" : "text-zinc-400"
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
