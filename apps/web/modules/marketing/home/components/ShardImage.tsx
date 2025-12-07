"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { cn } from "@ui/lib";

interface ShardImageProps {
  src: string;
  alt: string;
  clipPath: string;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
}

export function ShardImage({
  src,
  alt,
  clipPath,
  className,
  style,
  priority = false,
}: ShardImageProps) {
  return (
    <motion.div
      className={cn("absolute overflow-hidden", className)}
      style={{
        clipPath: clipPath,
        ...style,
      }}
      initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
      whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      viewport={{ once: true }}
    >
      <div className="relative h-full w-full">
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          priority={priority}
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      </div>
    </motion.div>
  );
}
