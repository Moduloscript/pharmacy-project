import * as React from "react";
import { cn } from "@ui/lib";
import { Card } from "./card";

// A thin wrapper around Card that exposes a selected state using tokens.
// Usage:
// <SelectableCard selected={value === 'pickup'} onClick={...}> ... </SelectableCard>
// Styles are token-driven and safe for dark/light themes.
export type SelectableCardProps = React.HTMLAttributes<HTMLDivElement> & {
  selected?: boolean;
  disabled?: boolean;
};

export const SelectableCard = React.forwardRef<HTMLDivElement, SelectableCardProps>(
  ({ className, selected, disabled, ...props }, ref) => {
    return (
      <Card
        ref={ref}
        className={cn(
          // Base outlined container using tokens
          "border border-border transition-colors",
          // Selected state: reinforce with primary outline/tint + ring to improve focus perception
          selected && "border-primary bg-primary/5 ring-2 ring-ring/40",
          // Disabled state (toned down but readable)
          disabled && "opacity-60 cursor-not-allowed",
          className,
        )}
        data-selected={selected ? "true" : undefined}
        aria-pressed={selected}
        {...props}
      />
    );
  },
);

SelectableCard.displayName = "SelectableCard";
