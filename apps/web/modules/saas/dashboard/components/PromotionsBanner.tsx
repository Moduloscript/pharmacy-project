"use client";

import { useSession } from "@saas/auth/hooks/use-session";
import { Card } from "@ui/components/card";
import { Button } from "@ui/components/button";
import { Badge } from "@ui/components/badge";
import { ArrowRightIcon, Sparkles } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@ui/components/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useRef } from "react";
import { usePromotions } from "../lib/queries";

import { useCustomerProfileQuery } from "@saas/auth/lib/api";

export function PromotionsBanner() {
  const { user } = useSession();
  const { data: customerProfile } = useCustomerProfileQuery();
  // Safe access to customer type using fresh data if needed for conditional promos
  const customerType = customerProfile?.customerType || (user as any)?.customer?.customerType;
  const plugin = useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  );

  const { data: promotions, isLoading } = usePromotions();

  const getColorClasses = (scheme: string) => {
    const schemes: Record<string, { color: string; textColor: string; buttonColor: string }> = {
      emerald: {
        color: "bg-emerald-100 border-emerald-500",
        textColor: "text-emerald-900",
        buttonColor: "bg-emerald-600 hover:bg-emerald-700",
      },
      blue: {
        color: "bg-blue-100 border-blue-500",
        textColor: "text-blue-900",
        buttonColor: "bg-blue-600 hover:bg-blue-700",
      },
      pink: {
        color: "bg-pink-100 border-pink-500",
        textColor: "text-pink-900",
        buttonColor: "bg-pink-600 hover:bg-pink-700",
      },
      amber: {
        color: "bg-amber-100 border-amber-500",
        textColor: "text-amber-900",
        buttonColor: "bg-amber-600 hover:bg-amber-700",
      },
      slate: {
        color: "bg-slate-100 border-slate-500",
        textColor: "text-slate-900",
        buttonColor: "bg-slate-600 hover:bg-slate-700",
      }
    };
    return schemes[scheme] || schemes.blue;
  };

  if (isLoading) {
    return (
      <Card className="h-64 animate-pulse bg-gray-100 border-2 border-black/10 shadow-none mb-8" />
    );
  }

  if (!promotions || promotions.length === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-black p-0 overflow-hidden shadow-hard mb-8 bg-white">
      <Carousel
        plugins={[plugin.current]}
        className="w-full"
        onMouseEnter={plugin.current.stop}
        onMouseLeave={plugin.current.reset}
      >
        <CarouselContent>
          {promotions.map((promo) => {
            const styles = getColorClasses(promo.colorScheme);
            return (
              <CarouselItem key={promo.id}>
                <div className={`flex flex-col md:grid md:grid-cols-12 h-auto md:h-full md:min-h-[320px] relative overflow-hidden ${styles.color}`}>
                  {/* Abstract Background Pattern - Positioned absolutely to cover entire card */}
                  <div className="absolute top-0 right-0 w-96 h-96 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none z-0" />
                  
                  {/* Text Section - Spans 7 columns to keep it safe on desktop */}
                  <div className="relative z-20 w-full md:col-span-7 p-6 md:p-10 flex flex-col justify-center items-start space-y-5 order-1">
                    <Badge variant="outline" className="bg-white/90 border-black text-black font-bold uppercase tracking-wider shadow-sm">
                      <Sparkles className="w-3 h-3 mr-1 text-amber-500 fill-amber-500" />
                      Limited Time Offer
                    </Badge>
                    
                    <div className="space-y-2">
                      <h2 className={`text-3xl md:text-5xl font-black uppercase tracking-tight leading-[0.9] ${styles.textColor} drop-shadow-sm`}>
                        {promo.title}
                      </h2>
                      <p className={`text-lg md:text-xl font-medium ${styles.textColor} opacity-90 max-w-md leading-relaxed`}>
                        {promo.description}
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      {promo.code && (
                        <div className="bg-white/60 border-2 border-dashed border-black/20 px-3 py-1.5 rounded font-mono text-sm font-bold tracking-widest uppercase text-black">
                          Code: <span className="text-black select-all">{promo.code}</span>
                        </div>
                      )}
                      <Button 
                        className={`${styles.buttonColor} text-white border-2 border-black font-bold uppercase h-10 px-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all`}
                      >
                        Shop Now <ArrowRightIcon className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Image Section - Relative on mobile (stacked), Absolute on desktop */}
                  <div className="relative md:absolute md:right-0 md:top-0 md:bottom-0 z-10 w-full h-64 md:h-auto md:w-[50%] overflow-visible pointer-events-none order-2 mt-4 md:mt-0">
                    {promo.imageUrl && promo.imageUrl.trim() !== '' ? (
                      <div className="relative w-full h-full">
                           <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-l from-transparent via-transparent to-white/20 mix-blend-overlay z-20" />
                           <Image 
                              src={promo.imageUrl} 
                              alt={promo.title} 
                              fill
                              className="object-contain object-center md:object-right md:object-center p-4 md:p-0 transition-transform duration-700 hover:scale-105"
                              priority
                              quality={100}
                              style={{
                                // Only apply the complex masking and transform on desktop to avoid weird mobile cropping
                                maskImage: 'linear-gradient(to right, transparent 0%, black 20%, black 100%)',
                                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 20%, black 100%)',
                                transform: 'none', // Reset transform for mobile by default
                              }}
                           />
                           {/* Desktop-specific styles injected via style tag or class override isn't ideal, so we use a style trick or just conditional classes if we could, but here we can rely on md: media queries in a cleaner way if we moved styles to classes. 
                               However, for inline styles like maskImage, we might need a better approach safely. 
                               Let's simplify: We'll keep the mask on both but adjust the gradient direction on mobile if needed, or just let it be. 
                               The transform 'scale(1.35)' was specific to the overlap look. 
                           */}
                           <style jsx global>{`
                             @media (min-width: 768px) {
                               .promo-image-${promo.id} {
                                 transform: scale(1.35) translateX(10%) translateY(5%) !important;
                               }
                             }
                           `}</style>
                           <Image 
                              src={promo.imageUrl} 
                              alt={promo.title} 
                              fill
                              className={`object-contain object-center md:object-right md:object-center p-0 transition-transform duration-700 hover:scale-105 promo-image-${promo.id}`}
                              priority
                              quality={100}
                              style={{
                                maskImage: 'linear-gradient(to right, transparent 0%, black 20%, black 100%)',
                                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 20%, black 100%)',
                              }}
                              unoptimized
                          />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-full h-full p-8 opacity-50">
                        <div className="flex items-center justify-center w-32 h-32 bg-white/30 rounded-full border-4 border-white/40 shadow-xl backdrop-blur-sm rotate-12">
                          <span className="text-5xl">💊</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        {/* Navigation buttons - positioned at vertical center edges */}
        <div className="hidden md:block">
          <CarouselPrevious className="left-2 top-1/2 -translate-y-1/2 bg-white/90 border-2 border-black hover:bg-zinc-100 hover:text-black shadow-lg z-30 h-10 w-10" />
          <CarouselNext className="right-2 top-1/2 -translate-y-1/2 bg-white/90 border-2 border-black hover:bg-zinc-100 hover:text-black shadow-lg z-30 h-10 w-10" />
        </div>
      </Carousel>
    </Card>
  );
}
