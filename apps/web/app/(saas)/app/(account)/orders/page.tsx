'use client'

import { OrderHistory } from '@/modules/saas/orders'
import { useOrderStats } from '@/modules/saas/orders/lib/queries'
import { Package, Clock, TrendingUp, Receipt, AlertCircle } from 'lucide-react'
import { Skeleton } from '@ui/components/skeleton'
import { Alert, AlertDescription } from '@ui/components/alert'

// Format currency helper
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('NGN', '₦')
}

// Format large numbers helper  
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

export default function OrdersPage() {
  const { data: stats, isLoading, error } = useOrderStats()
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 dark:from-slate-950 dark:to-slate-900">
      {/* Error Alert */}
      {error && (
        <div className="container mx-auto px-4 pt-4">
          <div className="max-w-6xl mx-auto">
            <Alert className="border-red-200 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load order statistics. Please refresh the page or try again later.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}
      
      {/* Material Design Header with Subtle Depth */}
      <div className="bg-white/95 backdrop-blur-sm shadow-md dark:bg-slate-900/95">
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-6xl mx-auto">
            {/* Material Design Header Section */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg">
                  <Package className="h-8 w-8 text-white" strokeWidth={1.5} />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">
                    Order History
                  </h1>
                  <p className="text-slate-600 mt-1 text-lg dark:text-slate-400">
                    Track your orders and manage deliveries
                  </p>
                </div>
              </div>
              
              {/* Material Design Stats Cards with Real Data */}
              <div className="hidden lg:flex items-center space-x-4">
                {/* Active Orders Card */}
                <div className="bg-white rounded-xl p-4 shadow-md border border-indigo-100 dark:bg-slate-800 dark:border-indigo-900/30">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-100 rounded-lg dark:bg-indigo-900/30">
                      <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" strokeWidth={2} />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium">Active Orders</p>
                      {isLoading ? (
                        <Skeleton className="h-8 w-12" />
                      ) : error ? (
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">-</p>
                      ) : (
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                          {formatNumber(stats?.activeOrders ?? 0)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* This Month Orders Card */}
                <div className="bg-white rounded-xl p-4 shadow-md border border-emerald-100 dark:bg-slate-800 dark:border-emerald-900/30">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-100 rounded-lg dark:bg-emerald-900/30">
                      <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium">This Month</p>
                      {isLoading ? (
                        <Skeleton className="h-8 w-12" />
                      ) : error ? (
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">-</p>
                      ) : (
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                          {formatNumber(stats?.thisMonthOrders ?? 0)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Total Savings Card */}
                <div className="bg-white rounded-xl p-4 shadow-md border border-amber-100 dark:bg-slate-800 dark:border-amber-900/30">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-amber-100 rounded-lg dark:bg-amber-900/30">
                      <Receipt className="h-5 w-5 text-amber-600 dark:text-amber-400" strokeWidth={2} />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium">Total Saved</p>
                      {isLoading ? (
                        <Skeleton className="h-8 w-16" />
                      ) : error ? (
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">-</p>
                      ) : (
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(stats?.totalSavings ?? 0)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content with Material Design Spacing */}
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <OrderHistory />
        </div>
      </div>
    </div>
  )
}
