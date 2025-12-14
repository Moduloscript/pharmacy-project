import React from "react";
import { cn } from "@ui/lib";

// Common props for these assets
interface AssetProps {
  className?: string;
  rotate?: string;
  delay?: number;
}

// 1. The 4-Pointed Star (Puffy 3D look)
export function Star3D({ className, rotate = "0deg", delay = 0 }: AssetProps) {
  return (
    <div
      className={cn("relative group select-none", className)}
      style={{ transform: `rotate(${rotate})`, animationDelay: `${delay}ms` }}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-16 h-16 md:w-24 md:h-24 drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-transform duration-300 hover:scale-110"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M50 0C50 0 55 25 75 35C95 45 100 50 100 50C100 50 75 55 65 75C55 95 50 100 50 100C50 100 45 75 25 65C5 55 0 50 0 50C0 50 25 45 35 25C45 5 50 0 50 0Z"
          fill="#FFF" // White/Cream star
          strokeWidth="3"
          className="stroke-black dark:stroke-white transition-colors"
        />
        {/* Inner shadow/depth line for 3D feel */}
        <path
          d="M50 100C50 100 45 75 25 65C5 55 0 50 0 50"
          stroke="black"
          strokeWidth="1"
          strokeOpacity="0.2"
          fill="none"
        />
      </svg>
    </div>
  );
}

// 2. The Mail/Envelope Block (Top-down 3D view)
export function MailBlock({ className, rotate = "0deg" }: AssetProps) {
  return (
    <div
      className={cn("relative group", className)}
      style={{ transform: `rotate(${rotate})` }}
    >
        {/* The 3D Block Container */}
       <div className="relative w-20 h-20 md:w-24 md:h-24">
            {/* Side/Shadow */}
            <div className="absolute inset-0 bg-black rounded-2xl transform translate-y-2 translate-x-2" />
            
            {/* Main Face */}
            <div className="absolute inset-0 bg-white border-[3px] border-black dark:border-white rounded-2xl flex items-center justify-center transition-transform active:translate-y-1 active:translate-x-1">
                 <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="stroke-black dark:stroke-black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                 </svg>
            </div>
       </div>
    </div>
  );
}

// 3. The Prescription/Medical Block (Replaces Code Window)
export function PrescriptionBlock({ className, rotate = "0deg" }: AssetProps) {
    return (
      <div
        className={cn("relative group", className)}
        style={{ transform: `rotate(${rotate})` }}
      >
         <div className="relative w-28 h-20 md:w-32 md:h-24">
              {/* Side/Shadow */}
              <div className="absolute inset-0 bg-black rounded-xl transform translate-y-2 translate-x-2" />
              
              {/* Main Face */}
              <div className="absolute inset-0 bg-white border-[3px] border-black dark:border-white rounded-xl overflow-hidden flex flex-col transition-transform active:translate-y-1 active:translate-x-1">
                   {/* Header Bar */}
                   <div className="h-6 w-full border-b-[3px] border-black dark:border-neutral-200 bg-green-100 flex items-center px-2 gap-1 justify-between">
                        <div className="flex gap-1">
                            <div className="w-2 h-2 rounded-full bg-black" />
                            <div className="w-2 h-2 rounded-full bg-black" />
                        </div>
                        <div className="text-[8px] font-bold">RX-2025</div>
                   </div>
                   {/* Content */}
                   <div className="flex-1 flex flex-col items-start justify-center p-3 gap-2 bg-[#FAFAFA]">
                       <div className="w-full h-2 bg-black/10 rounded-full" />
                       <div className="w-2/3 h-2 bg-black/10 rounded-full" />
                       <div className="absolute right-2 bottom-2">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6L6 18" />
                                <path d="M6 6L18 18" />
                            </svg>
                       </div>
                   </div>
              </div>
         </div>
      </div>
    );
  }

// 4. The Phone Block (Isometric)
export function PhoneBlock({ className, rotate = "0deg" }: AssetProps) {
    return (
        <div
            className={cn("relative group", className)}
            style={{ transform: `rotate(${rotate})` }}
        >
            <div className="relative w-16 h-28 md:w-20 md:h-32">
                 {/* Side Extrusion */}
                <div className="absolute inset-0 bg-black rounded-2xl transform translate-x-2 translate-y-3" />
                
                {/* Main Face */}
                <div className="absolute inset-0 bg-white border-[3px] border-black dark:border-white rounded-2xl p-2 flex flex-col items-center justify-between transition-transform duration-300 group-hover:-translate-y-2">
                     <div className="w-8 h-1 bg-black rounded-full mt-1" />
                     {/* Screen */}
                     <div className="w-full h-full my-2 bg-neutral-100 border-2 border-dashed border-black/20 rounded-lg" />
                     <div className="w-2 h-2 rounded-full border-2 border-black" />
                     
                     {/* Notification Badge */}
                     <div className="absolute -top-3 -right-3 w-8 h-8 bg-white border-[3px] border-black rounded-full flex items-center justify-center shadow-[2px_2px_0px_#000]">
                        <span className="font-bold text-xs">1</span>
                     </div>
                </div>
            </div>
        </div>
    )
}

// 5. Chat Bubble (Isometric)
export function ChatBubble({ className, rotate = "0deg" }: AssetProps) {
    return (
        <div
        className={cn("relative group", className)}
        style={{ transform: `rotate(${rotate})` }}
        >
             <div className="relative">
                 {/* Shadow */}
                 <svg width="140" height="80" viewBox="0 0 140 80" className="absolute top-2 left-2 fill-black">
                     <path d="M20 0H120C131.046 0 140 8.9543 140 20V50C140 61.0457 131.046 70 120 70H50L20 80L30 70H20C8.9543 70 0 61.0457 0 50V20C0 8.9543 8.9543 0 20 0Z" />
                 </svg>

                 {/* Main Bubble */}
                 <svg width="140" height="80" viewBox="0 0 140 80" className="relative fill-white stroke-black dark:stroke-white stroke-[3px] transition-transform active:translate-y-1 active:translate-x-1">
                     <path d="M20 1.5H120C130.217 1.5 138.5 9.78273 138.5 20V50C138.5 60.2173 130.217 68.5 120 68.5H50.5L20.5 78.5L30.5 68.5H20C9.78273 68.5 1.5 60.2173 1.5 50V20C1.5 9.78273 9.78273 1.5 20 1.5Z" />
                     {/* Dots */}
                     <circle cx="45" cy="35" r="5" fill="none" className="stroke-black dark:stroke-black" strokeWidth="2" />
                     <circle cx="70" cy="35" r="5" fill="none" className="stroke-black dark:stroke-black" strokeWidth="2" />
                     <circle cx="95" cy="35" r="5" fill="none" className="stroke-black dark:stroke-black" strokeWidth="2" />
                 </svg>
             </div>
        </div>
    )
}

// 6. Cylindrical Cylinder/Pill (Like previous "overflow" items)
export function CylinderBlock({ color, label, className, rotate = "0deg" }: AssetProps & { color: string, label: string }) {
    // Custom colors for cylinder
    const colorMap: Record<string, string> = {
        blue: "#2979FF",
        green: "#00E676",
        purple: "#B388FF"
    };
    
    return (
        <div className={cn("relative group", className)} style={{ transform: `rotate(${rotate})` }}>
            <div className="relative h-16 md:h-20 min-w-[80px] rounded-2xl">
                 {/* Shadow/Side */}
                 <div className="absolute inset-0 rounded-2xl bg-black transform translate-y-3 translate-x-1" />
                 
                 {/* Top */}
                 <div 
                    className="absolute inset-0 rounded-2xl border-[3px] border-black dark:border-white flex items-center justify-center px-4 transition-transform active:translate-y-1 active:translate-x-0"
                    style={{ backgroundColor: colorMap[color] || color }}
                 >
                     <span className="font-bold font-mono text-xl md:text-2xl pt-1 select-none">{label}</span>
                 </div>
            </div>
        </div>
    )
}

// 7. First Aid Kit (Box)
export function FirstAidKit({ className, rotate = "0deg" }: AssetProps) {
    return (
        <div className={cn("relative group", className)} style={{ transform: `rotate(${rotate})` }}>
           <div className="relative w-24 h-20 md:w-28 md:h-24">
                {/* Shadow */}
                <div className="absolute inset-0 bg-black rounded-2xl transform translate-x-2 translate-y-3" />
                {/* Main */}
                <div className="absolute inset-0 bg-[#FF4D00] border-[3px] border-black rounded-2xl flex items-center justify-center transition-transform group-hover:-translate-y-1 overflow-hidden">
                    {/* Cross Symbol */}
                    <div className="relative w-12 h-12 rotate-0">
                        <div className="absolute left-1/2 top-1 bottom-1 w-4 -translate-x-1/2 bg-white border-[3px] border-black rounded-sm z-10" />
                        <div className="absolute top-1/2 left-1 right-1 h-4 -translate-y-1/2 bg-white border-[3px] border-black rounded-sm z-0" />
                    </div>
                    {/* Shine */}
                    <div className="absolute top-0 right-0 w-8 h-8 bg-white/20 rounded-bl-3xl" />
                </div>
           </div>
        </div>
    )
}

// 8. Stethoscope (SVG)
export function Stethoscope({ className, rotate = "0deg" }: AssetProps) {
    return (
        <div className={cn("relative group select-none", className)} style={{ transform: `rotate(${rotate})` }}>
            <svg width="100" height="100" viewBox="0 0 100 100" className="drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:scale-105 transition-transform duration-300">
                {/* Tubing Shadow */}
                <path d="M30 15 C30 15 20 60 50 70 C80 80 85 30 85 30" stroke="black" strokeWidth="12" fill="none" strokeLinecap="round" transform="translate(4,4)" opacity="0.3" />
                
                {/* Tubing Outline */}
                <path d="M30 15 C30 15 20 60 50 70 C80 80 85 30 85 30" className="stroke-black dark:stroke-white transition-colors" strokeWidth="14" fill="none" strokeLinecap="round" />
                {/* Tubing Color */}
                <path d="M30 15 C30 15 20 60 50 70 C80 80 85 30 85 30" stroke="#B388FF" strokeWidth="8" fill="none" strokeLinecap="round" />
                
                {/* Chest Piece */}
                <g transform="translate(85,30)">
                    <circle cx="0" cy="0" r="14" fill="black" />
                    <circle cx="0" cy="0" r="10" fill="#FFD700" stroke="black" strokeWidth="3" />
                </g>
                
                {/* Ear Piece Area */}
                <path d="M30 15 L20 5 M30 15 L40 5" stroke="black" strokeWidth="6" strokeLinecap="round" />
                <circle cx="20" cy="5" r="5" fill="black" />
                <circle cx="40" cy="5" r="5" fill="black" />
            </svg>
        </div>
    )
}

// 9. Injection / Syringe (SVG)
export function Syringe({ className, rotate = "0deg" }: AssetProps) {
    return (
        <div className={cn("relative group select-none", className)} style={{ transform: `rotate(${rotate})` }}>
             <svg width="100" height="120" viewBox="0 0 100 120" className="drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:scale-110 transition-transform duration-300">
                {/* Plunger Top */}
                <rect x="35" y="0" width="30" height="8" fill="black" rx="2" />
                <rect x="45" y="0" width="10" height="45" fill="gray" stroke="black" strokeWidth="3" />
                
                {/* Barrel */}
                <rect x="30" y="30" width="40" height="60" fill="white" stroke="black" strokeWidth="3" rx="4" />
                
                {/* Liquid */}
                <rect x="33" y="55" width="34" height="32" fill="#CCFF00" rx="2" />
                
                {/* Graduations */}
                <path d="M33 50 H67" stroke="black" strokeWidth="2" />
                <path d="M33 60 H50" stroke="black" strokeWidth="2" />
                <path d="M33 70 H55" stroke="black" strokeWidth="2" />
                <path d="M33 80 H50" stroke="black" strokeWidth="2" />
                
                {/* Needle Base */}
                <rect x="45" y="90" width="10" height="6" className="fill-black dark:fill-white" />
                {/* Needle */}
                <rect x="48" y="96" width="4" height="24" fill="#C0C0C0" className="stroke-black dark:stroke-white" strokeWidth="1" />
             </svg>
        </div>
    )
}
