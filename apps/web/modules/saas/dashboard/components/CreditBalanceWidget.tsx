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
  const { data: customerProfile } = useCustomerProfileQuery();
  
  // Robust check for customer type using profile query as source of truth
  const customerType = customerProfile?.customerType || (user as any)?.customer?.customerType;

  // Mock data for B2B credit
  // In a real app, fetch this from a credit/ledger API
  const creditLimit = 3000000;
  const usedCredit = 2450000;
  const availableCredit = creditLimit - usedCredit;
  const percentUsed = (usedCredit / creditLimit) * 100;

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
    <Card className="border-2 border-black p-6 bg-white shadow-hard">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#FFFCF7] border border-black rounded-none">
            <WalletIcon className="h-5 w-5 text-black" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Credit Balance</h3>
            <div className="text-2xl font-black text-black">
              ₦{availableCredit.toLocaleString()}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold uppercase text-zinc-500">Limit</div>
          <div className="text-sm font-bold">₦{creditLimit.toLocaleString()}</div>
        </div>
      </div>

      <div className="space-y-2 mb-6">
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
          <span>Used: {Math.round(percentUsed)}%</span>
          <span>Available</span>
        </div>
        <div className="h-3 w-full bg-zinc-100 border border-black relative overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-1000",
              percentUsed > 90 ? "bg-red-500" : percentUsed > 75 ? "bg-amber-500" : "bg-black"
            )}
            style={{ width: `${percentUsed}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="border-2 border-black font-bold uppercase text-[10px] h-8" asChild>
          <Link href="/app/billing/invoices">
            <FileTextIcon className="w-3 h-3 mr-2" />
            Statement
          </Link>
        </Button>
        <Button className="bg-[#FF4500] hover:bg-[#ff571a] text-white border-2 border-black font-bold uppercase text-[10px] h-8 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all">
          Pay Now
        </Button>
      </div>
    </Card>
  );
}
