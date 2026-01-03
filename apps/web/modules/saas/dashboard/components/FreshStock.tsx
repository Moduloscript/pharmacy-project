"use client";

import { useProducts } from "@saas/products/lib/queries";
import { Button } from "@ui/components/button";
import { PillIcon, PackageIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@ui/lib";
import { Product } from "@saas/products/lib/api";

export function FreshStock() {
  const { data, isLoading } = useProducts({ 
    sort: 'created_at_desc',
    limit: 4 
  });

  const products = data?.products || [];

  if (isLoading) {
    return (
        <div className="mb-12">
            <div className="flex items-end justify-between mb-8 pb-4 border-b-4 border-black dark:border-white">
                <h2 className="text-3xl font-display font-black uppercase tracking-tighter text-black dark:text-white flex items-center gap-3">
                    <PackageIcon className="h-8 w-8 text-[#8B83F6]" />
                    Fresh Stock
                </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-64 bg-zinc-100 animate-pulse border-2 border-zinc-200" />
                ))}
            </div>
        </div>
    )
  }

  // Fallback if no products
  if (products.length === 0) return null;

  return (
    <div className="mb-12">
        <div className="flex items-end justify-between mb-8 pb-4 border-b-4 border-black dark:border-white">
            <h2 className="text-3xl font-display font-black uppercase tracking-tighter text-black dark:text-white flex items-center gap-3">
                <PackageIcon className="h-8 w-8 text-[#8B83F6]" />
                Fresh Stock
            </h2>
            <Link 
                href="/app/products" 
                className="text-sm font-bold uppercase border-b-2 border-black hover:bg-black hover:text-white transition-all px-1"
            >
                VIEW_ALL_SKUS &rarr;
            </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.slice(0, 4).map((product: Product, index: number) => {
                // Determine styling based on index or category
                const bgColors = ["bg-[#FFFCF7]", "bg-[#E6E6FA]", "bg-[#FFEFD5]", "bg-[#E0F7FA]"];
                const bg = bgColors[index % bgColors.length];
                
                // Stock status logic
                const qty = product.stockQuantity;
                let stockStatus = "IN STOCK";
                
                if (qty === undefined || qty === null) {
                    stockStatus = "UNKNOWN";
                } else if (qty === 0) {
                    stockStatus = "OUT_OF_STOCK";
                } else if (qty < 10) {
                    stockStatus = "LIMITED";
                }
                
                // Brutalist colors (more saturated/defined)
                const stockColor = stockStatus === "LIMITED" ? "bg-[#FFD700] text-black" // Gold
                    : stockStatus === "OUT_OF_STOCK" ? "bg-red-500 text-white"
                    : stockStatus === "UNKNOWN" ? "bg-gray-500 text-white" // Grey
                    : "bg-[#00E676] text-black"; // Vivid Green

                return (
                    <div 
                        key={product.id} 
                        className="group relative bg-white dark:bg-zinc-900 border-2 border-black dark:border-white/20 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.5)] transition-all duration-300"
                    >
                        {/* Product Image Area */}
                        <div className={cn("h-48 w-full flex items-center justify-center border-b-2 border-black dark:border-white/20 relative overflow-hidden", bg)}>
                            <div className="absolute inset-0 opacity-10" 
                                style={{backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)", backgroundSize: "10px 10px"}} 
                            />
                            
                            {/* Image or Placeholder */}
                            {product.image_url ? (
                                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover z-10 drop-shadow-sm group-hover:scale-110 transition-transform duration-500 mix-blend-multiply dark:mix-blend-normal" />
                            ) : (
                                <div className="bg-white border-2 border-black p-4 rotate-3 group-hover:rotate-0 transition-all duration-500 shadow-sm z-10">
                                    <PillIcon className="h-10 w-10 text-black" />
                                </div>
                            )}

                            <div className="absolute top-2 right-2 bg-black text-white dark:bg-white dark:text-black text-[10px] font-black px-2 py-1 uppercase transform rotate-2 z-20 shadow-sm border border-transparent dark:border-black">
                                {product.category || "Uncategorized"}
                            </div>
                        </div>
                        
                        {/* Product Details */}
                        <div className="p-5 space-y-4">
                            <div>
                                <h4 className="font-black text-lg text-black dark:text-white uppercase leading-tight line-clamp-1 group-hover:underline decoration-2 underline-offset-2" title={product.name}>
                                    {product.name}
                                </h4>
                                <p className="font-mono text-xl font-bold text-[#FF4500] mt-1 relative inline-block">
                                    ₦{product.retailPrice?.toLocaleString() || "0"}
                                    {/* Decorative underline */}
                                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-black/10 dark:bg-white/10" />
                                </p>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t-2 border-dashed border-zinc-300 dark:border-zinc-700">
                                <span className={cn(
                                    "text-[10px] font-black uppercase px-3 py-1.5 border-2 border-black dark:border-transparent shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-none",
                                    stockColor
                                )}>
                                    {stockStatus.replace(/_/g, " ")}
                                </span>
                                <Button className="h-9 text-xs font-black uppercase bg-black dark:bg-white text-white dark:text-black hover:bg-[#8B83F6] dark:hover:bg-[#8B83F6] hover:text-white border-2 border-transparent hover:border-black transition-all rounded-none px-6 shadow-none hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" asChild>
                                    <Link href={`/app/products/${product.id}`}>
                                        Add +
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
  );
}
