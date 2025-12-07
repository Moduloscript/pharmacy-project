"use client";
import {
  motion,
  useScroll,
  useVelocity,
  useTransform,
  useSpring,
} from "framer-motion";
import React, { useRef } from "react";

interface VelocityTextProps {
  children: React.ReactNode;
  className?: string;
}

export const VelocityText = ({ children, className }: VelocityTextProps) => {
  const targetRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start end", "end start"],
  });

  const scrollVelocity = useVelocity(scrollYProgress);

  const skewXRaw = useTransform(
    scrollVelocity,
    [-0.5, 0.5],
    ["45deg", "-45deg"]
  );
  const skewX = useSpring(skewXRaw, { mass: 3, stiffness: 400, damping: 50 });

  const xRaw = useTransform(scrollYProgress, [0, 1], [0, -1000]);
  const x = useSpring(xRaw, { mass: 3, stiffness: 400, damping: 50 });

  return (
    <section
      ref={targetRef}
      className={`relative w-full overflow-hidden ${className}`}
    >
      <div className="flex items-center overflow-hidden py-10">
        <motion.div
          style={{ skewX, x }}
          className="origin-bottom-left whitespace-nowrap"
        >
          {children}
        </motion.div>
      </div>
    </section>
  );
};
