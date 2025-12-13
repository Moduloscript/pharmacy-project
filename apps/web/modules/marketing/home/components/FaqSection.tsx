"use client";

import { useRef, useState, useEffect } from "react";
import { cn } from "@ui/lib";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion } from "framer-motion";
import { 
	Upload, 
	Truck, 
	ShieldCheck, 
	CreditCard, 
	AlertTriangle, 
	MessageCircle,
    ArrowUpRight
} from "lucide-react";
import { Keycap, PixelCursor } from "./Keycap";
import { Keycap3D } from "./Keycap3D";
import { 
    Star3D, 
    MailBlock, 
    PhoneBlock, 
    ChatBubble,
    CylinderBlock,
    PrescriptionBlock,
    FirstAidKit,
    Stethoscope,
    Syringe
} from "./BrutalistAssets";
import { BrutalistStickyScroll } from "@/components/ui/sticky-scroll-reveal";
import { VelocityText } from "@/components/ui/velocity-text";


export function FaqSection({ className }: { className?: string }) {
	const t = useTranslations();
    const sectionRef = useRef<HTMLElement>(null);
    const constraintsRef = useRef(null);
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
    const [isHoveringKey, setIsHoveringKey] = useState(false);
    const [showCursor, setShowCursor] = useState(false);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!sectionRef.current) return;
        // Calculate position relative to the section element
        const rect = sectionRef.current.getBoundingClientRect();
        
        setCursorPos({ 
            x: e.clientX - rect.left, 
            y: e.clientY - rect.top 
        });
    };

	const items = [
		{
			icon: Upload,
            bg: "bg-[#FF4D00]", // Orange
			question: "UPLOAD PRESCRIPTION",
			answer: "Securely upload your prescription image or document during checkout or directly from.",
            rotate: "hover:-rotate-2"
		},
		{
			icon: Truck,
            bg: "bg-[#FAFF00]", // Acid Yellow
			question: "DELIVERY TIMELINE",
			answer: "Lagos orders delivered within 24 hours. Nationwide delivery takes 2-3 business days.",
            rotate: "hover:rotate-1"
		},
		{
			icon: ShieldCheck,
            bg: "bg-[#D4B3FF]", // Soft Purple
			question: "DATA SECURITY",
			answer: "We adhere to strict data privacy regulations with industry-standard encryption.",
            rotate: "hover:-rotate-1"
		},
		{
			icon: CreditCard,
            bg: "bg-[#00FF99]", // Mint/Teal
			question: "INSURANCE SUPPORT",
			answer: "We accept major HMOs. Select your provider at checkout or contact support.",
            rotate: "hover:rotate-2"
		},
		{
			icon: AlertTriangle,
            bg: "bg-[#FF90E8]", // Pink
			question: "REJECTION POLICY",
			answer: "Immediate notification via email/SMS if verification fails, with clear instructions.",
            rotate: "hover:-rotate-2"
		},
		{
			icon: MessageCircle,
            bg: "bg-[#CCFF00]", // Lime
			question: "PHARMACIST CHAT",
			answer: "Request a consultation or ask questions via our secure dashboard chat feature.",
            rotate: "hover:rotate-1"
		},
	];

	if (!items) {
		return null;
	}

	return (
		<section
			ref={sectionRef}
			className={cn("scroll-mt-20 relative bg-neutral-100 dark:bg-zinc-950 text-neutral-900 dark:text-neutral-100 overflow-hidden border-t-2 border-neutral-200 dark:border-neutral-800 cursor-none", className)}
			id="faq"
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setShowCursor(true)}
            onMouseLeave={() => setShowCursor(false)}
		>

            {/* Background Layers */}
            <div className="absolute inset-0 pattern-grid pointer-events-none opacity-[0.4]" />
            
            {/* Top Velocity Text */}
            <div className="relative z-10 py-12 opacity-30 pointer-events-none scale-110">
                <VelocityText>
                    <span className="text-5xl font-black uppercase leading-[0.85] md:text-7xl md:leading-[0.85] text-black dark:text-white block px-4">
                         FREQUENTLY ASKED QUESTIONS — FAQ — HELP CENTER — SUPPORT — 
                    </span>
                </VelocityText>
            </div>
            
			<div className="container relative z-10 max-w-[1400px] mx-auto px-6 py-24 lg:py-32">
				
                {/* Cinematic Header - Neo-Brutalist Split Layout */}
                {/* Cinematic Header - Neo-Brutalist Split Layout */}
                <div className="w-full relative min-h-[600px] mb-24 rounded-3xl overflow-hidden bg-[#F2F0E9] dark:bg-[#1a1a1a] shadow-2xl border-2 border-black dark:border-neutral-700 flex flex-col lg:flex-row transition-colors duration-300">
                    
                    {/* --- LEFT SIDE: Typography & Branding --- */}
                    <div className="relative z-20 w-full lg:w-[45%] p-8 md:p-12 lg:p-16 flex flex-col justify-center items-start overflow-hidden bg-black/10 dark:bg-black/20 backdrop-blur-[2px]">
                        
                        {/* Background "Eye" - Absolute positioned - Full Cover - High Quality */}
                        <div className="absolute inset-0 z-0 select-none overflow-hidden">
                            {/* Removed scaling to prevent pixelation - using standard cover */}
                            <div className="absolute inset-0 w-full h-full opacity-100 mix-blend-normal">
                                <Image 
                                    src="/images/faq-eye-final.jpg" 
                                    alt="Background Texture" 
                                    fill
                                    className="object-cover object-center"
                                    quality={100}
                                />
                                {/* Gradient Overlay to ensure text readability at bottom/top */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 mix-blend-multiply" />
                            </div>
                        </div>

                        <div className="relative z-10">
                            {/* Text with strong Brutalist Shadow for readability on complex background */}
                            <h1 className="font-black text-6xl sm:text-7xl lg:text-8xl leading-[0.85] tracking-tighter text-[#F2F0E9] mb-6 drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                                NEED<br/>HELP?
                            </h1>
                            {/* Decorative underline/tape - Adjusted color for contrast */}
                            <div className="absolute -bottom-2 right-0 w-32 h-4 bg-[#FFD731] -rotate-2 shadow-[2px_2px_0px_rgba(0,0,0,1)] z-10" />
                        </div>
                        
                        <p className="relative z-10 font-bold text-sm md:text-base tracking-widest text-white/90 uppercase mb-8 ml-2 drop-shadow-[2px_2px_0px_rgba(0,0,0,0.8)]">
                            Support • Questions • Info
                        </p>
                        
                        {/* Brutalist Button Group - Enhanced for visibility */}
                        <div className="relative z-10 flex items-stretch ml-1 shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-transform active:translate-y-1 active:translate-x-1 active:shadow-[2px_2px_0px_rgba(0,0,0,1)] cursor-pointer group/btn">
                            <div className="bg-[#F2F0E9] text-black px-8 py-4 font-mono font-bold text-xl flex items-center group-hover/btn:bg-white transition-colors border-2 border-black">
                                Contact
                            </div>
                            <div className="bg-[#4A90E2] text-black w-14 flex items-center justify-center border-y-2 border-r-2 border-black group-hover/btn:bg-[#357ABD] transition-colors">
                                <ArrowUpRight className="w-6 h-6" />
                            </div>
                        </div>
                    </div>

                    {/* --- RIGHT SIDE: The "Overflow" 3D Scene --- */}
                    <div className="relative w-full lg:w-[55%] min-h-[500px] lg:min-h-full overflow-hidden border-l-0 lg:border-l-2 border-black dark:border-neutral-700 bg-[#F2F0E9] dark:bg-[#1a1a1a]">
                        
                        {/* Grid Background - Using CSS Mask or simply dark mode variant */}
                        <div className="absolute inset-0 opacity-100 transition-colors"
                            style={{
                                backgroundImage: 'linear-gradient(var(--grid-color) 1px, transparent 1px), linear-gradient(90deg, var(--grid-color) 1px, transparent 1px)',
                                backgroundSize: '50px 50px',
                                '--grid-color': '#4A90E2'
                            } as any}
                        />
                        {/* Dark mode grid overlay adjustment (optional) */}
                        <div className="absolute inset-0 bg-transparent dark:bg-black/80 pointer-events-none" />

                        {/* The "Pile" of Keycaps - Using SVG-based Keycap3D 
                            Matches Sui Overflow's home-hero__visual-inner structure:
                            - height: 55em (880px)
                            - display: flex; justify-content: center; align-items: center
                        */}
                        <div 
                            className="absolute inset-0 flex items-center justify-center z-[2]"
                        >
                            {/* Main visual container - BIGGER & BOLDER */}
                            <div 
                                className="relative"
                                ref={constraintsRef}
                                style={{ 
                                    width: '550px', 
                                    height: '480px',
                                    transform: 'scale(1.15)',
                                    transformOrigin: 'center center'
                                }}
                            >
                                {/* === DECORATIVE ELEMENTS === */}
                                
                                {/* Stars - reduced size */}
                                <Star3D rotate="-15deg" className="absolute -top-8 -left-4 z-[5] text-yellow-400 drop-shadow-[2px_2px_0px_#000] w-6 h-6" />
                                <Star3D rotate="20deg" className="absolute top-[200px] -left-8 z-[2] text-neutral-300 w-4 h-4" />

                                {/* Mail - top right - reduced size */}
                                <MailBlock rotate="10deg" className="absolute -top-4 right-4 z-[8] scale-[0.5]" />
                                
                                {/* Phone - far right - reduced size */}
                                <PhoneBlock rotate="18deg" className="absolute top-16 -right-8 z-[2] scale-[0.5]" />

                                {/* === KEYCAP PILE - CENTERED READABLE LAYOUT === */}
                                {/* 
                                    Spelling out: P - H - A - R - M
                                    Two rows, centered, minimal overlap for readability
                                */}
                                
                                {/* === TOP ROW: P - H - A === */}
                                
                                {/* P - Orange */}
                                <Keycap3D 
                                    char="P" 
                                    color="orange" 
                                    dragConstraints={constraintsRef}
                                    onHoverStart={() => setIsHoveringKey(true)}
                                    onHoverEnd={() => setIsHoveringKey(false)}
                                    className="absolute w-[130px] z-[30]"
                                    style={{ 
                                        top: '40px', 
                                        left: '60px',
                                        transform: 'rotate(-8deg)'
                                    }}
                                />
                                
                                {/* H - Purple */}
                                <Keycap3D 
                                    char="H" 
                                    color="purple" 
                                    dragConstraints={constraintsRef}
                                    onHoverStart={() => setIsHoveringKey(true)}
                                    onHoverEnd={() => setIsHoveringKey(false)}
                                    className="absolute w-[130px] z-[40]"
                                    style={{ 
                                        top: '60px', 
                                        left: '180px',
                                        transform: 'rotate(5deg)'
                                    }}
                                />

                                {/* A - Violet */}
                                <Keycap3D 
                                    char="A" 
                                    color="violet" 
                                    dragConstraints={constraintsRef}
                                    onHoverStart={() => setIsHoveringKey(true)}
                                    onHoverEnd={() => setIsHoveringKey(false)}
                                    className="absolute w-[130px] z-[35]"
                                    style={{ 
                                        top: '35px', 
                                        left: '300px',
                                        transform: 'rotate(-3deg)'
                                    }}
                                />

                                {/* === BOTTOM ROW: R - M === */}

                                {/* R - Blue */}
                                <Keycap3D 
                                    char="R" 
                                    color="blue" 
                                    dragConstraints={constraintsRef}
                                    onHoverStart={() => setIsHoveringKey(true)}
                                    onHoverEnd={() => setIsHoveringKey(false)}
                                    className="absolute w-[130px] z-[45]"
                                    style={{ 
                                        top: '170px', 
                                        left: '100px',
                                        transform: 'rotate(-10deg)'
                                    }}
                                />
                                
                                {/* M - Yellow (center bottom, prominent) */}
                                <Keycap3D 
                                    char="M" 
                                    color="yellow" 
                                    dragConstraints={constraintsRef}
                                    onHoverStart={() => setIsHoveringKey(true)}
                                    onHoverEnd={() => setIsHoveringKey(false)}
                                    className="absolute w-[135px] z-[50]"
                                    style={{ 
                                        top: '180px', 
                                        left: '230px',
                                        transform: 'rotate(6deg)'
                                    }}
                                />

                                {/* === ACCENT KEYS === */}

                                {/* Rx - Green (pharmacy symbol) */}
                                <Keycap3D 
                                    char="Rx" 
                                    color="green" 
                                    dragConstraints={constraintsRef}
                                    onHoverStart={() => setIsHoveringKey(true)}
                                    onHoverEnd={() => setIsHoveringKey(false)}
                                    className="absolute w-[120px] z-[38]"
                                    style={{ 
                                        top: '165px', 
                                        left: '360px',
                                        transform: 'rotate(12deg)'
                                    }}
                                />

                                {/* + key - Orange accent */}
                                <Keycap3D 
                                    char="+" 
                                    color="orange" 
                                    dragConstraints={constraintsRef}
                                    onHoverStart={() => setIsHoveringKey(true)}
                                    onHoverEnd={() => setIsHoveringKey(false)}
                                    className="absolute w-[110px] z-[28]"
                                    style={{ 
                                        top: '290px', 
                                        left: '180px',
                                        transform: 'rotate(-5deg)'
                                    }}
                                />



                                {/* === DECORATIVE ASSETS === */}

                                {/* Chat Bubble - Moved to bottom-middle (red X) */}
                                <ChatBubble rotate="-8deg" className="absolute top-[340px] left-[280px] z-[25] scale-[0.6]" />

                                {/* Syringe - right-middle - reduced size */}
                                <Syringe className="absolute top-[220px] right-[-20px] z-[25] scale-[0.45]" rotate="-15deg" />

                                {/* Stethoscope - Bottom Left - reduced size */}
                                <Stethoscope className="absolute top-[300px] left-[20px] z-[55] scale-[0.4]" rotate="-15deg" />

                                {/* First Aid Kit - Bottom Right - reduced size */}
                                <FirstAidKit className="absolute top-[280px] right-[-10px] z-[55] scale-[0.4]" rotate="12deg" />



                            </div>
                        </div>

                        {/* Decoration: Tape or rough edge */}
                         <div className="absolute -bottom-12 -right-12 w-48 h-12 bg-black -rotate-45 hidden lg:block" />
                    </div>
                </div>

				{/* Brutalist StickyScroll FAQ Section */}
				<BrutalistStickyScroll 
					className="shadow-[12px_12px_0px_#000]"
					content={[
						{
							title: "UPLOAD PRESCRIPTION",
							description: "Securely upload your prescription image or document during checkout or directly from your dashboard. Our system validates and processes it instantly.",
							backgroundColor: "#FF4D00",
							content: (
								<div className="flex items-center justify-center">
									<PrescriptionBlock rotate="-5deg" className="scale-[0.9]" />
								</div>
							),
						},
						{
							title: "DELIVERY TIMELINE",
							description: "Lagos orders delivered within 24 hours. Nationwide delivery takes 2-3 business days. Track your order in real-time from dispatch to doorstep.",
							backgroundColor: "#FAFF00",
							content: (
								<div className="flex items-center justify-center p-4">
									<div className="bg-black p-6 rounded-2xl shadow-[6px_6px_0px_rgba(0,0,0,0.3)] border-4 border-black">
										<Truck className="w-24 h-24 text-[#FAFF00]" strokeWidth={2.5} />
									</div>
								</div>
							),
						},
						{
							title: "DATA SECURITY",
							description: "We adhere to strict data privacy regulations with industry-standard encryption. Your medical information is protected with bank-level security protocols.",
							backgroundColor: "#D4B3FF",
							content: (
								<div className="flex items-center justify-center p-4">
									<div className="bg-black p-6 rounded-2xl shadow-[6px_6px_0px_rgba(0,0,0,0.3)] border-4 border-black">
										<ShieldCheck className="w-24 h-24 text-[#D4B3FF]" strokeWidth={2.5} />
									</div>
								</div>
							),
						},
						{
							title: "INSURANCE SUPPORT",
							description: "We accept major HMOs including Hygeia, AXA Mansard, and Leadway. Select your provider at checkout or contact our support team for assistance.",
							backgroundColor: "#00FF99",
							content: (
								<div className="flex items-center justify-center">
									<FirstAidKit rotate="8deg" className="scale-[1.1]" />
								</div>
							),
						},
						{
							title: "REJECTION POLICY",
							description: "Immediate notification via email/SMS if prescription verification fails. We provide clear instructions on how to resolve issues and resubmit.",
							backgroundColor: "#FF90E8",
							content: (
								<div className="flex items-center justify-center p-4">
									<div className="bg-black p-6 rounded-2xl shadow-[6px_6px_0px_rgba(0,0,0,0.3)] border-4 border-black">
										<AlertTriangle className="w-24 h-24 text-[#FF90E8]" strokeWidth={2.5} />
									</div>
								</div>
							),
						},
						{
							title: "PHARMACIST CHAT",
							description: "Request a consultation or ask questions via our secure dashboard chat feature. Our licensed pharmacists are available to assist you.",
							backgroundColor: "#CCFF00",
							content: (
								<div className="flex items-center justify-center p-4">
									<div className="bg-black p-6 rounded-2xl shadow-[6px_6px_0px_rgba(0,0,0,0.3)] border-4 border-black">
										<MessageCircle className="w-24 h-24 text-[#CCFF00]" strokeWidth={2.5} />
									</div>
								</div>
							),
						},
					]}
				/>
                
			</div>

            {/* Bottom Velocity Text */}
            <div className="relative z-10 py-12 opacity-30 pointer-events-none scale-110">
                <VelocityText>
                    <span className="text-5xl font-black uppercase leading-[0.85] md:text-7xl md:leading-[0.85] text-black dark:text-white block px-4">
                         PERSISTENCE — DETERMINATION — PRESS ON — SOLUTIONS — FAQ — 
                    </span>
                </VelocityText>
            </div>

			{/* THE PIXEL CURSOR - Section-level for full coverage */}
			<motion.div
				className="fixed pointer-events-none z-[200]"
				initial={{ x: 0, y: 0 }}
				animate={{
					x: cursorPos.x - 22,
					y: cursorPos.y - 14,
					scale: isHoveringKey ? 1.3 : 1,
					opacity: showCursor ? 1 : 0
				}}
				transition={{
					type: "spring",
					damping: 28,
					stiffness: 350,
					mass: 0.8
				}}
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
				}}
			>
				<PixelCursor className="text-white drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]" />
			</motion.div>
		</section>
	);
}
