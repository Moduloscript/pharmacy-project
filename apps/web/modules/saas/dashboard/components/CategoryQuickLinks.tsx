"use client";

import Link from "next/link";
import { cn } from "@ui/lib";
import { 
  PillIcon, 
  SyringeIcon, 
  BabyIcon, 
  ActivityIcon, 
  StethoscopeIcon, 
  HeartPulseIcon,
  ShoppingBagIcon,
  MicroscopeIcon,
  SparklesIcon
} from "lucide-react";
import { useState, useEffect } from "react";

export function CategoryQuickLinks() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    async function fetchStats() {
      try {
        const response = await fetch('/api/products/stats/categories', {
          signal: controller.signal
        });
        if (response.ok && mounted) {
          const data = await response.json();
          if (mounted) {
            setStats(data.stats || {});
          }
        }
      } catch (error: any) {
        if (error.name !== 'AbortError' && mounted) {
          console.error('Failed to fetch category stats', error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    fetchStats();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  const categories = [
    { 
      name: "Antibiotics", 
      id: "ANTIBIOTICS",
      icon: PillIcon, 
      href: "/app/products?category=ANTIBIOTICS", 
      bg: "bg-[#8B83F6]",
      featured: true
    },
    { 
      name: "Pain Relief", 
      id: "PAIN_RELIEF",
      icon: HeartPulseIcon, 
      href: "/app/products?category=PAIN_RELIEF", 
      bg: "bg-[#FF4500]",
      textWhite: true,
      featured: true
    },
    { 
      name: "Vitamins", 
      id: "VITAMINS",
      icon: ActivityIcon, 
      href: "/app/products?category=VITAMINS", 
      bg: "bg-[#50C878]"
    },
    { 
      name: "Baby Care", 
      id: "BABY_CARE",
      icon: BabyIcon, 
      href: "/app/products?category=BABY_CARE", 
      bg: "bg-[#FFB6C1]"
    },
    { 
      name: "Diabetes", 
      id: "DIABETES_CARE",
      icon: SyringeIcon, 
      href: "/app/products?category=DIABETES_CARE", 
      bg: "bg-[#E6E0FF]"
    },
    { 
      name: "First Aid", 
      id: "FIRST_AID",
      icon: StethoscopeIcon, 
      href: "/app/products?category=FIRST_AID", 
      bg: "bg-[#FFD700]"
    },
    { 
      name: "Skin Care", 
      id: "SKIN_CARE",
      icon: MicroscopeIcon, 
      href: "/app/products?category=SKIN_CARE", 
      bg: "bg-[#FFFCF7]"
    },
    { 
      name: "Browse All", 
      id: "ALL",
      icon: ShoppingBagIcon, 
      href: "/app/products", 
      bg: "bg-black",
      textWhite: true
    },
  ];

  return (
    <div className="mb-12">
      <div className="flex items-end justify-between mb-6 pb-4 border-b-4 border-black dark:border-white">
        <h2 className="text-2xl font-display font-black uppercase tracking-tighter text-black dark:text-white flex items-center gap-3">
          <PillIcon className="h-6 w-6 text-[#8B83F6]" />
          Shop by Category
        </h2>
        <Link 
          href="/app/products" 
          className="text-xs font-bold uppercase border-b-2 border-black dark:border-white dark:text-white hover:bg-black hover:text-white transition-all px-1 mb-1"
        >
          View Full Catalog &rarr;
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {categories.map((cat, index) => {
          // Get count from stats, default to 0. For "Browse All", we don't have a specific count readily available sum, or just show "500+" as placeholder/total if we had it.
          // Actually, let's sum up all stats for "Browse All" or keep it generic.
          const count = cat.id === 'ALL' 
            ? Object.values(stats).reduce((a, b) => a + b, 0) || 0
            : (stats[cat.id] || 0);
            
          return (
          <Link 
            key={cat.name} 
            href={cat.href}
            className="group relative block"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Shadow layer */}
            <div className="absolute inset-0 bg-black translate-x-1 translate-y-1 transition-transform group-hover:translate-x-2 group-hover:translate-y-2" />
            
            {/* Main card */}
            <div 
              className={cn(
                "relative flex flex-col items-center justify-center p-4 border-2 border-black transition-all duration-200",
                "group-hover:-translate-y-1 group-hover:-translate-x-1",
                cat.bg
              )}
            >
              {/* Featured badge - only show if count > 0 for featured items */}
              {cat.featured && count > 0 && (
                <div className="absolute -top-2 -right-2 bg-[#FF4500] border-2 border-black p-1 rotate-12 z-10">
                  <SparklesIcon className="w-3 h-3 text-white" />
                </div>
              )}

              {/* Icon container - square brutalist style */}
              <div 
                className={cn(
                  "w-12 h-12 flex items-center justify-center mb-3 border-2 border-black bg-white",
                  "transform rotate-3 group-hover:rotate-0 transition-transform duration-300",
                  "shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                )}
              >
                <cat.icon 
                  className="w-6 h-6 text-black" 
                  strokeWidth={2.5} 
                />
              </div>

              {/* Category name */}
              <span 
                className={cn(
                  "text-[10px] font-black uppercase tracking-wider text-center leading-tight",
                  "group-hover:underline underline-offset-2 decoration-2",
                  cat.textWhite ? "text-white" : "text-black"
                )}
              >
                {cat.name}
              </span>

              {/* Item count */}
              <span 
                className={cn(
                  "text-[8px] font-mono mt-1 opacity-70",
                  cat.textWhite ? "text-white" : "text-black"
                )}
              >
                {loading ? "..." : `${count} items`}
              </span>

              {/* Dot pattern overlay for texture */}
              <div 
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                  backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)",
                  backgroundSize: "8px 8px"
                }}
              />
            </div>
          </Link>
        )})}
      </div>
    </div>
  );
}
