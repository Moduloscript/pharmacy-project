"use client";

import { useSession } from "@saas/auth/hooks/use-session";
import { Card } from "@ui/components/card";
import { Button } from "@ui/components/button";
import { cn } from "@ui/lib";
import { WalletIcon, FileTextIcon, ArrowRightIcon } from "lucide-react";
import Link from "next/link";

import { useCustomerProfileQuery } from "@saas/auth/lib/api";

export function CreditBalanceWidget() {
  const { user } = useSession();
  const { data: customerProfile, isLoading } = useCustomerProfileQuery();

  if (isLoading) {
    return (
      <Card className="border-2 border-black p-6 bg-gray-100 shadow-hard animate-pulse h-[200px]">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gray-300 border border-black" />
            <div className="space-y-2">
              <div className="w-24 h-3 bg-gray-300" />
              <div className="w-32 h-6 bg-gray-300" />
            </div>
          </div>
        </div>
        <div className="space-y-4 mt-8">
           <div className="w-full h-3 bg-gray-300" />
           <div className="w-2/3 h-3 bg-gray-300" />
        </div>
      </Card>
    );
  }
  
  // Robust check for customer type using profile query as source of truth
  const customerType = customerProfile?.customerType || (user as any)?.customer?.customerType;

  // Real data from API
  // @ts-ignore - Properties added dynamically in API
  const creditLimit = Number(customerProfile?.creditLimit || 0);
  // @ts-ignore - Properties added dynamically in API
  const usedCredit = Number(customerProfile?.usedCredit || 0);
  
  const availableCredit = Math.max(0, creditLimit - usedCredit);
  const percentUsed = creditLimit > 0 ? (usedCredit / creditLimit) * 100 : 0;

  // Show different content for retail vs wholesale customers
  if (customerType !== 'WHOLESALE') {
    return (
      <Card className="border-2 border-black p-6 bg-[#E6E0FF] shadow-hard">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white border border-black rounded-none">
              <WalletIcon className="h-5 w-5 text-[#8B83F6]" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-600">Retail Account</h3>
              <div className="text-lg font-black text-black">Pay per Order</div>
            </div>
          </div>
        </div>
        <p className="text-sm text-zinc-600 mb-4">
          Upgrade to a <span className="font-bold">Wholesale Account</span> to access credit terms, bulk pricing, and exclusive deals.
        </p>
        <Button className="w-full bg-black hover:bg-[#8B83F6] text-white border-2 border-transparent font-bold uppercase text-xs" asChild>
          <Link href="/app/settings/billing">
            Upgrade to Wholesale <ArrowRightIcon className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-black dark:border-zinc-100 p-6 bg-white dark:bg-zinc-950 shadow-hard dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#CCFF00] dark:bg-zinc-900 border border-black dark:border-zinc-100 rounded-none transform -rotate-2">
            <WalletIcon className="h-5 w-5 text-black dark:text-zinc-100" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Credit Balance</h3>
            <div className="text-2xl font-black text-black dark:text-white">
              ₦{availableCredit.toLocaleString()}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold uppercase text-zinc-500 dark:text-zinc-400">Limit</div>
          <div className="text-sm font-bold text-black dark:text-white">₦{creditLimit.toLocaleString()}</div>
        </div>
      </div>

      <div className="space-y-2 mb-6">
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-black dark:text-zinc-200">
          <div>Used: {Math.round(percentUsed)}%</div>
          <div>Available</div>
        </div>
        <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-900 border border-black dark:border-zinc-100 relative overflow-hidden">
          <div 
            className="h-full bg-[#FF9500] transition-all duration-1000"
            style={{ width: `${percentUsed}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="border-2 border-black dark:border-zinc-100 font-bold uppercase text-[10px] h-8 text-black dark:text-zinc-100 hover:bg-[#00FFFF] dark:hover:bg-zinc-900 transition-colors" asChild>
          <Link href="/app/billing/invoices">
            <FileTextIcon className="w-3 h-3 mr-2" />
            Statement
          </Link>
        </Button>
        <Button className="bg-[#FF4500] hover:bg-[#ff571a] text-white border-2 border-black dark:border-zinc-100 font-bold uppercase text-[10px] h-8 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] transition-all">
          Pay Now
        </Button>
      </div>
    </Card>
  );
}
