"use client";

import { cn } from "@ui/lib";
import {
	Activity,
	BarChart3,
	Bot,
	FileText,
	Globe,
	Package,
	ShieldCheck,
	Truck,
	Zap,
} from "lucide-react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import {
	fadeInUp,
	getAnimationProps,
} from "../../../../lib/animation-utils";
import Image, { type StaticImageData } from "next/image";
import React, { type JSXElementConstructor, type ReactNode } from "react";
import aiIcon from "../../../../public/images/ai-icon.svg";
import complianceIcon from "../../../../public/images/compliance-icon.svg";
import heroImage from "../../../../public/images/hero.svg";
import inventoryIcon from "../../../../public/images/inventory-icon.svg";
import { VelocityText } from "../../../../components/ui/velocity-text";

export const featureTabs: Array<{
	id: string;
	title: string;
	icon: JSXElementConstructor<any>;
	color: string;
	subtitle?: string;
	description?: ReactNode;
	image?: StaticImageData;
	imageBorder?: boolean;
	stack?: {
		title: string;
		href: string;
		icon: JSXElementConstructor<any>;
	}[];
	highlights?: {
		title: string;
		description: string;
		icon: JSXElementConstructor<any>;
		demoLink?: string;
		docsLink?: string;
	}[];
}> = [
	{
		id: "inventory",
		title: "Smart Inventory",
		icon: Package,
		color: "#06B6D4",
		subtitle: "Precision control for your supply chain.",
		description:
			"Manage your pharmaceutical catalog with unprecedented ease. Real-time stock levels, batch tracking, and automated alerts keep your operations running smoothly.",
		stack: [],
		image: inventoryIcon,
		imageBorder: false,
		highlights: [
			{
				title: "Real-time Updates",
				description:
					"Monitor stock levels instantly across all your distribution centers with live data synchronization.",
				icon: Activity,
			},
			{
				title: "Batch Tracking",
				description:
					"Complete traceability for every batch, ensuring safety and compliance throughout the lifecycle.",
				icon: BarChart3,
			},
			{
				title: "Global Logistics",
				description:
					"Seamlessly manage international shipments with built-in customs and regulatory support.",
				icon: Globe,
			},
		],
	},
	{
		id: "compliance",
		title: "Compliance First",
		icon: ShieldCheck,
		color: "#EC4899",
		subtitle: "Security and regulation built-in.",
		description:
			"Navigate complex regulations with confidence. Our platform handles prescription verification, secure document storage, and audit trails automatically.",
		stack: [],
		image: complianceIcon,
		imageBorder: false,
		highlights: [
			{
				title: "Secure Uploads",
				description:
					"Bank-grade encryption for all sensitive documents and prescription uploads.",
				icon: FileText,
			},
			{
				title: "Audit Ready",
				description:
					"Automated logging of all actions creates a bulletproof audit trail for regulatory inspections.",
				icon: ShieldCheck,
			},
			{
				title: "Verified Chains",
				description:
					"Ensure chain of custody integrity with immutable transaction records.",
				icon: Zap,
			},
		],
	},
	{
		id: "ai",
		title: "AI Operations",
		icon: Bot,
		color: "#FBBF24",
		subtitle: "Intelligent automation for pharma.",
		description:
			"Empower your team with BenPharma AI. From predictive analytics to instant support queries, our AI assistant optimizes every step of your workflow.",
		stack: [],
		image: aiIcon,
		imageBorder: false,
		highlights: [
			{
				title: "Predictive Analytics",
				description:
					"Forecast demand and prevent stockouts with advanced machine learning models.",
				icon: BarChart3,
			},
			{
				title: "Instant Support",
				description:
					"Our AI assistant provides immediate answers to operational and compliance questions.",
				icon: Bot,
			},
			{
				title: "Smart Routing",
				description:
					"Optimize delivery routes and carrier selection automatically for cost and speed.",
				icon: Truck,
			},
		],
	},
];

export function Features() {
	const ref = React.useRef(null);
	const { scrollYProgress } = useScroll({
		target: ref,
		offset: ["start start", "end start"],
	});

	const springConfig = { stiffness: 100, damping: 50, bounce: 20 };

	const translateX = useSpring(
		useTransform(scrollYProgress, [0, 1], [0, 1000]),
		springConfig
	);
	const translateXReverse = useSpring(
		useTransform(scrollYProgress, [0, 1], [0, -1000]),
		springConfig
	);
	const rotateX = useSpring(
		useTransform(scrollYProgress, [0, 0.2], [15, 0]),
		springConfig
	);
	const opacity = useSpring(
		useTransform(scrollYProgress, [0, 0.2], [0.2, 1]),
		springConfig
	);
	const rotateZ = useSpring(
		useTransform(scrollYProgress, [0, 0.2], [20, 0]),
		springConfig
	);
	const translateY = useSpring(
		useTransform(scrollYProgress, [0, 0.2], [-700, 500]),
		springConfig
	);

	return (
		<div
			ref={ref}
			className="h-[300vh] py-40 overflow-hidden antialiased relative flex flex-col self-auto [perspective:1000px] [transform-style:preserve-3d] bg-background"
		>
			<div className="max-w-7xl relative mx-auto py-20 md:py-40 px-4 w-full left-0 top-0">
				<motion.div
					className="mx-auto mb-6 lg:mb-0 lg:max-w-5xl lg:text-center"
					{...getAnimationProps(fadeInUp)}
				>
					<h2 className="font-black text-4xl lg:text-6xl uppercase tracking-tight">
						Everything your pharmacy{" "}
						<span className="bg-[var(--color-accent)] px-2 text-black border-2 border-black inline-block transform -rotate-1">
							needs
						</span>
					</h2>
					<p className="mt-6 text-balance text-lg font-medium opacity-70">
						A complete ecosystem for pharmaceutical management. Control inventory, ensure compliance, and leverage AI insights—all in one secure platform.
					</p>
				</motion.div>
			</div>
			
			<motion.div
				style={{
					rotateX,
					rotateZ,
					translateY,
					opacity,
				}}
				className=""
			>
				<motion.div className="flex flex-row-reverse space-x-reverse space-x-20 mb-20">
					{featureTabs.map((feature) => (
						<FeatureCard
							feature={feature}
							translate={translateX}
							key={feature.title}
						/>
					))}
				</motion.div>
				<motion.div className="flex flex-row mb-20 space-x-20">
					{featureTabs.map((feature) => (
						<FeatureCard
							feature={feature}
							translate={translateXReverse}
							key={feature.title + "-reverse"}
						/>
					))}
				</motion.div>
			</motion.div>
			
			<VelocityText className="absolute bottom-40 left-0 z-10 w-full py-10">
				<span className="text-7xl font-black uppercase text-[var(--color-accent)] [-webkit-text-stroke:2px_black] dark:[-webkit-text-stroke:2px_white] md:text-9xl opacity-80">
					Smart Inventory — Compliance First — AI Operations — Smart Inventory — Compliance First — AI Operations —
				</span>
			</VelocityText>
		</div>
	);
}

const FeatureCard = ({
	feature,
	translate,
}: {
	feature: typeof featureTabs[0];
	translate: any;
}) => {
	return (
		<motion.div
			style={{
				x: translate,
			}}
			whileHover={{
				y: -20,
			}}
			key={feature.title}
			className="group/product h-96 w-[30rem] relative shrink-0"
		>
			<div className="block group-hover/product:shadow-2xl h-full w-full bg-card border-2 border-black dark:border-white rounded-xl relative overflow-hidden">
				<div className="absolute inset-0 z-0 overflow-hidden rounded-xl">
					{feature.image && (
						<Image
							src={feature.image}
							alt={feature.title}
							className="object-cover object-center h-full w-full opacity-50"
						/>
					)}
				</div>
				<div className="absolute inset-0 z-10 bg-gradient-to-t from-background via-background/90 to-transparent p-8 flex flex-col justify-end">
					<div 
						className="size-12 rounded-lg flex items-center justify-center mb-4 border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#fff]"
						style={{ backgroundColor: feature.color }}
					>
						<feature.icon className="size-6 text-black" />
					</div>
					<h3 className="text-2xl font-bold mb-2">{feature.title}</h3>
					<p className="text-foreground/80 font-medium leading-relaxed line-clamp-4">{feature.description}</p>
				</div>
			</div>
		</motion.div>
	);
};
