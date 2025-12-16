"use client";

import { cn } from "@ui/lib";
import { motion } from "framer-motion";
import * as React from "react";

interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  direction?: "left" | "right";
  pauseOnHover?: boolean;
  reverse?: boolean;
  fade?: boolean;
  innerClassName?: string;
  numberOfCopies?: number;
}

export function Marquee({
  children,
  direction = "left",
  pauseOnHover = false,
  reverse = false,
  fade = false,
  className,
  innerClassName,
  numberOfCopies = 2,
  ...props
}: MarqueeProps) {
  return (
    <div
      className={cn(
        "group flex overflow-hidden p-2 [--duration:40s] [--gap:1rem] [gap:var(--gap)]",
        {
          "flex-row": direction === "left",
          "flex-row-reverse": direction === "right",
        },
        className,
      )}
      {...props}
    >
      {Array(numberOfCopies)
        .fill(0)
        .map((_, i) => (
          <motion.div
            key={i}
            initial={{ x: 0 }}
            animate={{ x: direction === "left" ? "-100%" : "100%" }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
            className={cn(
              "flex shrink-0 justify-around [gap:var(--gap)]",
              {
                "animate-marquee": !reverse,
                "animate-marquee-reverse": reverse,
                "group-hover:[animation-play-state:paused]": pauseOnHover,
              },
              innerClassName,
            )}
          >
            {children}
          </motion.div>
        ))}
    </div>
  );
}
