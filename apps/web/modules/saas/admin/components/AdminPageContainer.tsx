"use client";

import { cn } from "@ui/lib";
import type { ReactNode } from "react";

type MaxWidthOption = 
  | "sm" 
  | "md" 
  | "lg" 
  | "xl" 
  | "2xl" 
  | "3xl" 
  | "4xl" 
  | "5xl" 
  | "6xl" 
  | "7xl" 
  | "full";

interface AdminPageContainerProps {
  children: ReactNode;
  className?: string;
  /** 
   * Maximum width of the content area.
   * @default "5xl" (~1024px) for a balanced dashboard feel
   */
  maxWidth?: MaxWidthOption;
}

const maxWidthMap: Record<MaxWidthOption, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  full: "",
};

/**
 * Standardized container for admin pages.
 * Provides consistent padding, responsive margins, and configurable max-width.
 */
export function AdminPageContainer({
  children,
  className,
  maxWidth = "5xl",
}: AdminPageContainerProps) {
  return (
    <div
      className={cn(
        "container mx-auto px-4 sm:px-6 lg:px-8 py-8",
        maxWidthMap[maxWidth],
        className
      )}
    >
      {children}
    </div>
  );
}
