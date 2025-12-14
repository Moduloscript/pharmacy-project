"use client";

import React, { useEffect, useRef, useState } from "react";
import { useMotionValueEvent, useScroll, motion, AnimatePresence } from "framer-motion";
import { cn } from "@ui/lib";

export interface StickyScrollContent {
  title: string;
  description: string;
  content?: React.ReactNode;
  backgroundColor?: string;
}

export interface BrutalistStickyScrollProps {
  content: StickyScrollContent[];
  contentClassName?: string;
  className?: string;
}

export const BrutalistStickyScroll = ({
  content,
  contentClassName,
  className,
}: BrutalistStickyScrollProps) => {
  const [activeCard, setActiveCard] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    container: ref,
    offset: ["start start", "end start"],
  });

  const cardLength = content.length;

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const cardsBreakpoints = content.map((_, index) => index / cardLength);
    const closestBreakpointIndex = cardsBreakpoints.reduce(
      (acc, breakpoint, index) => {
        const distance = Math.abs(latest - breakpoint);
        if (distance < Math.abs(latest - cardsBreakpoints[acc])) {
          return index;
        }
        return acc;
      },
      0
    );
    setActiveCard(closestBreakpointIndex);
  });

  // Brutalist background colors - cycling through your FAQ card colors
  const backgroundColors = [
    "#FF4D00", // Orange
    "#FAFF00", // Acid Yellow  
    "#D4B3FF", // Soft Purple
    "#00FF99", // Mint/Teal
    "#FF90E8", // Pink
    "#CCFF00", // Lime
  ];

  const [backgroundColor, setBackgroundColor] = useState(backgroundColors[0]);

  useEffect(() => {
    const newColor = content[activeCard]?.backgroundColor || 
      backgroundColors[activeCard % backgroundColors.length];
    setBackgroundColor(newColor);
  }, [activeCard, content]);

  return (
    <motion.div
      className={cn(
        "relative flex h-[40rem] justify-between overflow-y-auto rounded-xl border-2 border-black dark:border-neutral-700",
        className
      )}
      ref={ref}
      style={{ backgroundColor }}
      animate={{ backgroundColor }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
    >
      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Text content side - scrollable */}
      <div className="relative flex items-start px-8 lg:px-12 py-10 w-full lg:w-[55%]">
        <div className="max-w-xl">
          {content.map((item, index) => (
            <div key={item.title + index} className="my-12 first:mt-6">
              {/* Number badge */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{
                  opacity: activeCard === index ? 1 : 0.3,
                  x: 0,
                }}
                transition={{ duration: 0.3 }}
                className="inline-block mb-4"
              >
                <span className="font-mono font-bold text-sm bg-black text-white px-3 py-1 rounded-full">
                  {(index + 1).toString().padStart(2, '0')}
                </span>
              </motion.div>

              {/* Title */}
              <motion.h3
                initial={{ opacity: 0 }}
                animate={{
                  opacity: activeCard === index ? 1 : 0.3,
                }}
                transition={{ duration: 0.3 }}
                className="text-2xl lg:text-3xl font-black text-black tracking-tight mb-4"
              >
                {item.title}
              </motion.h3>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{
                  opacity: activeCard === index ? 1 : 0.3,
                }}
                transition={{ duration: 0.3 }}
                className="text-base lg:text-lg font-medium text-black/80 max-w-md leading-relaxed"
              >
                {item.description}
              </motion.p>

              {/* Brutalist accent line */}
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: activeCard === index ? "80px" : "0px",
                }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="h-1 bg-black mt-6"
              />

              {/* Combined Visual Block - Shown Inline on MOBILE ONLY */}
               <div className="block lg:hidden mt-12 mb-12">
                 <div
                  className={cn(
                    "relative flex items-center justify-center w-full aspect-square sm:aspect-video max-w-[500px]",
                    "overflow-hidden rounded-2xl mx-0", 
                    "bg-white/20 backdrop-blur-sm",
                    "border-2 border-black shadow-[8px_8px_0px_#000]",
                    contentClassName
                  )}
                 >
                    {item.content}
                 </div>
               </div>
            </div>
          ))}
          {/* Spacer for scroll */}
          <div className="h-96" />
        </div>
      </div>
      
      {/* Sticky visual side - RESTORED FOR DESKTOP */}
      <div
        className={cn(
          "sticky top-10 right-0 hidden lg:flex items-center justify-center",
          "h-[320px] w-[320px] m-10 mr-12",
          "overflow-hidden rounded-2xl",
          "bg-white/20 backdrop-blur-sm",
          "border-2 border-black shadow-[8px_8px_0px_#000]",
          contentClassName
        )}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCard}
            initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotate: 10 }}
            transition={{ 
              duration: 0.4, 
              ease: [0.23, 1, 0.32, 1] 
            }}
            className="flex items-center justify-center w-full h-full"
          >
            {content[activeCard]?.content ?? null}
          </motion.div>
        </AnimatePresence>
      </div>

    </motion.div>
  );
};

export default BrutalistStickyScroll;
