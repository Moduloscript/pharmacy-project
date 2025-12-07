"use client";

import { LocaleLink } from "@i18n/routing";
import { Button } from "@ui/components/button";
import { ArrowRightIcon } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import {
	fadeInUp,
	staggerContainer,
	staggerItem,
	getAnimationProps,
} from "../../../../lib/animation-utils";
import heroImageDark from "../../../../public/images/hero-image-dark.png";
import heroImage from "../../../../public/images/hero-image.png";
import dockImage from "../../../../public/images/dock.png";

const Marquee = () => {
	return (
		<div className="relative flex flex-col border-y-4 border-black bg-[var(--color-accent)] dark:border-white">
			{/* First Line - Scrolling Right to Left */}
			<div className="relative flex overflow-x-hidden border-b-2 border-black py-4 dark:border-white">
				<motion.div
					className="flex whitespace-nowrap"
					animate={{ x: [0, -1000] }}
					transition={{
						repeat: Number.POSITIVE_INFINITY,
						ease: "linear",
						duration: 20,
					}}
				>
					{[...Array(10)].map((_, i) => (
						<span key={i} className="mx-10 text-lg font-black uppercase tracking-widest text-black">
							⚡ PHARMA • 🚀 SAAS • ✓ COMPLIANCE • 🔒 SECURITY
						</span>
					))}
				</motion.div>
			</div>

			{/* Second Line - Scrolling Left to Right */}
			<div className="relative flex overflow-x-hidden border-b-2 border-black py-4 dark:border-white">
				<motion.div
					className="flex whitespace-nowrap"
					animate={{ x: [-1000, 0] }}
					transition={{
						repeat: Number.POSITIVE_INFINITY,
						ease: "linear",
						duration: 25,
					}}
				>
					{[...Array(10)].map((_, i) => (
						<span key={i} className="mx-10 text-lg font-black uppercase tracking-widest text-black">
							💊 INVENTORY • 📦 LOGISTICS • 🏥 HEALTHCARE • 💪 RELIABILITY
						</span>
					))}
				</motion.div>
			</div>

			{/* Third Line - Scrolling Right to Left (Faster) */}
			<div className="relative flex overflow-x-hidden py-4">
				<motion.div
					className="flex whitespace-nowrap"
					animate={{ x: [0, -1000] }}
					transition={{
						repeat: Number.POSITIVE_INFINITY,
						ease: "linear",
						duration: 15,
					}}
				>
					{[...Array(10)].map((_, i) => (
						<span key={i} className="mx-10 text-lg font-black uppercase tracking-widest text-black">
							⚡ SPEED • 🌐 GLOBAL • 📊 ANALYTICS • 🎯 PRECISION
						</span>
					))}
				</motion.div>
			</div>
		</div>
	);
};

const FloatingIcon = ({ 
	children, 
	delay = 0, 
	className = "",
	duration = 3
}: { 
	children: React.ReactNode; 
	delay?: number; 
	className?: string;
	duration?: number;
}) => {
	return (
		<motion.div
			className={`absolute ${className}`}
			initial={{ opacity: 0, scale: 0, rotate: -10 }}
			animate={{ 
				opacity: [0, 1, 1, 0],
				scale: [0.8, 1.1, 1, 0.9],
				rotate: [-10, 5, -5, 10],
				y: [0, -20, 0, -10]
			}}
			transition={{
				duration,
				delay,
				repeat: Number.POSITIVE_INFINITY,
				ease: "easeInOut"
			}}
		>
			{children}
		</motion.div>
	);
};

export function Hero() {
	return (
		<div className="relative min-h-[90vh] w-full overflow-hidden bg-background text-foreground">
			{/* Grid Background */}
			<div className="absolute inset-0 z-0 opacity-20"
				style={{
					backgroundImage: `linear-gradient(to right, #808080 1px, transparent 1px),
					linear-gradient(to bottom, #808080 1px, transparent 1px)`,
					backgroundSize: "40px 40px",
				}}
			/>

			{/* Dock Image - Background Element */}
			<motion.div
				className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/4 w-full max-w-6xl opacity-80 pointer-events-none z-0 hidden lg:block dark:opacity-35"
				initial={{ opacity: 0, scale: 0.9 }}
				animate={{ opacity: 0.8, scale: 1 }}
				transition={{ duration: 1.5, delay: 0.2 }}
			>
				<Image
					src={dockImage}
					alt="Dock Background"
					className="w-full h-auto brightness-50 dark:brightness-100"
					priority
				/>
			</motion.div>

			<div className="container relative z-10 flex flex-col items-center pt-20 pb-12 lg:pt-32">
			
			{/* Floating Playful Icons */}
			<FloatingIcon delay={0} duration={4} className="top-32 left-[10%] hidden lg:block">
				<div className="text-6xl">👍</div>
			</FloatingIcon>
			
			<FloatingIcon delay={1} duration={5} className="top-20 right-[15%] hidden lg:block">
				<div className="text-5xl">⭐</div>
			</FloatingIcon>
			
			<FloatingIcon delay={0.5} duration={4.5} className="top-[40%] left-[5%] hidden lg:block">
				<div className="text-5xl">😊</div>
			</FloatingIcon>
			
			<FloatingIcon delay={1.5} duration={3.5} className="top-[35%] right-[8%] hidden lg:block">
				<div className="text-6xl">💬</div>
			</FloatingIcon>
			
			<FloatingIcon delay={2} duration={4} className="top-[60%] left-[12%] hidden lg:block">
				<div className="text-4xl">✨</div>
			</FloatingIcon>
			
			<FloatingIcon delay={0.8} duration={5} className="top-[55%] right-[10%] hidden lg:block">
				<div className="text-5xl">⭐</div>
			</FloatingIcon>
			
			<FloatingIcon delay={1.2} duration={3.8} className="top-[25%] left-[20%] hidden lg:block">
				<div className="text-4xl">✨</div>
			</FloatingIcon>
			
			<FloatingIcon delay={1.8} duration={4.2} className="top-[48%] right-[18%] hidden lg:block">
				<div className="text-5xl">😊</div>
			</FloatingIcon>
				
				{/* Badge */}
				<motion.div
					className="mb-8 inline-flex items-center border-2 border-black bg-white px-4 py-2 font-bold text-black shadow-[4px_4px_0px_0px_#000] dark:border-white dark:shadow-[4px_4px_0px_0px_#fff]"
					{...getAnimationProps(fadeInUp)}
					whileHover={{ scale: 1.05, rotate: -2 }}
				>
					<span className="mr-2 flex size-3 items-center justify-center rounded-full bg-[var(--color-accent)] border border-black" />
					<span className="text-xs uppercase tracking-wider">
						v2.0 Now Available
					</span>
				</motion.div>

				{/* Headline */}
				<motion.h1
					className="mx-auto max-w-5xl text-center font-bold text-5xl uppercase leading-[0.9] tracking-tighter lg:text-8xl relative z-30"
					{...getAnimationProps(fadeInUp)}
					transition={{ delay: 0.1 }}
				>
					<span className="text-white [-webkit-text-stroke:2px_black] dark:text-black dark:[-webkit-text-stroke:2px_white]">
						The BenPharma
					</span> <br />
					<span className="bg-[var(--color-accent)] px-2 text-black">
						Platform
					</span>
				</motion.h1>

				{/* Subheadline */}
				<motion.p
					className="mx-auto mt-8 max-w-2xl text-center font-semibold text-lg text-foreground md:text-xl relative z-30 drop-shadow-sm"
					{...getAnimationProps(fadeInUp)}
					transition={{ delay: 0.2 }}
				>
					Streamline your pharmaceutical operations with our cutting-edge, compliance-first platform. Built for speed, security, and scale.
				</motion.p>

				{/* Buttons */}
				<motion.div
					className="mt-10 flex flex-col gap-4 sm:flex-row relative z-10"
					variants={staggerContainer}
					initial="hidden"
					whileInView="visible"
					viewport={{ once: true }}
				>
					<motion.div variants={staggerItem}>
						<Button size="lg" variant="primary" asChild>
							<LocaleLink href="/auth/login">
								Start Free Trial
								<ArrowRightIcon className="ml-2 size-5" />
							</LocaleLink>
						</Button>
					</motion.div>
					<motion.div variants={staggerItem}>
						<Button variant="outline" size="lg" asChild>
							<LocaleLink href="/docs">Read Documentation</LocaleLink>
						</Button>
					</motion.div>
				</motion.div>

				{/* Hero Image */}
				<motion.div
					className="mt-20 w-full max-w-6xl relative z-10"
					initial={{ opacity: 0, y: 40, scale: 0.95 }}
					whileInView={{ opacity: 1, y: 0, scale: 1 }}
					transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
					viewport={{ once: true }}
				>
					<div className="relative rounded-xl border-4 border-black bg-black p-2 shadow-[12px_12px_0px_0px_#000] dark:border-white dark:bg-white dark:shadow-[12px_12px_0px_0px_#fff]">
						<div className="relative overflow-hidden rounded-lg border-2 border-black dark:border-black">
							<Image
								src={heroImage}
								alt="Dashboard Preview"
								className="block w-full dark:hidden"
								priority
							/>
							<Image
								src={heroImageDark}
								alt="Dashboard Preview"
								className="hidden w-full dark:block"
								priority
							/>
						</div>
					</div>
				</motion.div>
			</div>

			{/* Marquee Section */}
			<div className="mt-12 w-full rotate-[-2deg] scale-110 transform">
				<Marquee />
			</div>
		</div>
	);
}
