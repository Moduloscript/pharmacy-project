import React from "react";
import { cn } from "@ui/lib";

interface KeycapProps {
  char?: string;
  icon?: React.ReactNode;
  color: "orange" | "purple" | "blue" | "yellow" | "pink" | "green" | "white";
  className?: string;
  rotate?: string;
  delay?: number;
}

export function Keycap({ char, icon, color, className, rotate = "0deg", delay = 0 }: KeycapProps) {
  // Color maps for the top face and the 3D side (extrusion)
  const colors = {
    orange: { top: "#FF6B00", side: "#CC5500", shadow: "#994000" },
    purple: { top: "#B388FF", side: "#7C4DFF", shadow: "#651FFF" },
    blue:   { top: "#2979FF", side: "#2962FF", shadow: "#0039CB" }, // Updated to a more vibrant blue like the reference
    yellow: { top: "#FFD600", side: "#FFAB00", shadow: "#FF6D00" },
    pink:   { top: "#FF80AB", side: "#F50057", shadow: "#C51162" },
    green:  { top: "#00E676", side: "#00C853", shadow: "#009624" },
    white:  { top: "#FFFFFF", side: "#E0E0E0", shadow: "#BDBDBD" },
  };

  const theme = colors[color];

  return (
    <div
      className={cn("relative group select-none transition-transform hover:scale-105 duration-300 ease-out", className)}
      style={{
        transform: `rotate(${rotate})`,
        animationDelay: `${delay}ms`
      }}
    >
      <div className="relative">
        {/* Shadow/Extrusion Layer */}
        <div
          className="absolute top-2 left-0 w-full h-full rounded-2xl"
          style={{
            backgroundColor: theme.side,
            transform: "translateY(8px)", // The depth of the key
            boxShadow: "0px 20px 40px rgba(0,0,0,0.4)" // Drop shadow on the floor
          }}
        />
        
        {/* Top Face */}
        <div
          className="relative flex items-center justify-center w-24 h-24 md:w-32 md:h-32 rounded-2xl border-b-4 border-black/10 active:translate-y-2 active:border-b-0 transition-all cursor-pointer"
          style={{
            backgroundColor: theme.top,
          }}
        >
             {/* Inner Surface Highlight (Subtle Gradients/Inset) */}
             <div className="absolute inset-2 rounded-xl bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />

            {/* Character/Icon */}
             <div className="relative z-10 font-black text-4xl md:text-6xl text-black/80 drop-shadow-sm font-mono transform -rotate-1">
                {icon ? icon : char}
             </div>
        </div>
      </div>
    </div>
  );
}

// Pixel Art Mouse Pointer Component
export function PixelCursor({ className }: { className?: string }) {
    return (
        <svg 
            viewBox="0 0 24 24" 
            className={cn("w-16 h-16 md:w-24 md:h-24 drop-shadow-xl", className)}
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
        >
            <path 
                d="M5.5 3.5L11.5 20.5L13.5 13.5L20.5 11.5L5.5 3.5Z" 
                fill="white" 
                stroke="black" 
                strokeWidth="2" 
                strokeLinejoin="round" // Sharp corners for pixel feel
            />
            {/* Inner fill for better visibility */}
        </svg>
    );
}
