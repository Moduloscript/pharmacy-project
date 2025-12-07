"use client";

import { cn } from "@ui/lib";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Quote } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

const testimonials = [
	{
		id: 1,
		name: "Sarah Jenkins",
		role: "Pharmacy Director at HealthFlow",
		image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&auto=format&fit=crop&q=60",
		quote: "I switched 5 years ago and never looked back. The compliance features alone have saved us countless hours.",
	},
	{
		id: 2,
		name: "Michael Chen",
		role: "Operations Lead at MedCore",
		image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&auto=format&fit=crop&q=60",
		quote: "It's just the best. Period. The AI inventory predictions are scarily accurate.",
	},
	{
		id: 3,
		name: "Emily Rodriguez",
		role: "Compliance Officer",
		image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&auto=format&fit=crop&q=60",
		quote: "I'd be lost without BenPharma. The audit trails are bulletproof. Best investment we've made.",
	},
	{
		id: 4,
		name: "David Kim",
		role: "Regional Manager",
		image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&auto=format&fit=crop&q=60",
		quote: "Simple, intuitive, and powerful. We got the whole team onboarded in less than 10 minutes.",
	},
	{
		id: 5,
		name: "Lisa Thompson",
		role: "Pharmacist",
		image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&auto=format&fit=crop&q=60",
		quote: "Finally, software that doesn't feel like it was built in the 90s. A joy to use every day.",
	},
	{
		id: 6,
		name: "James Wilson",
		role: "Pharmacy Owner",
		image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&auto=format&fit=crop&q=60",
		quote: "The ROI was immediate. We cut our waste by 40% in the first month alone.",
	},
	{
		id: 7,
		name: "Anna Kowalski",
		role: "Clinical Pharmacist",
		image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&auto=format&fit=crop&q=60",
		quote: "The patient safety checks are a lifesaver. Literally. I sleep better at night knowing BenPharma is watching.",
	},
	{
		id: 8,
		name: "Robert Fox",
		role: "Supply Chain Manager",
		image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&auto=format&fit=crop&q=60",
		quote: "Managing multiple locations used to be a nightmare. Now it's my favorite part of the day.",
	},
	{
		id: 9,
		name: "Maria Garcia",
		role: "Tech Lead",
		image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&auto=format&fit=crop&q=60",
		quote: "From a technical standpoint, the API is a dream. Integration was seamless.",
	},
	{
		id: 10,
		name: "Thomas Anderson",
		role: "CEO at NeoPharm",
		image: "https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=400&h=400&auto=format&fit=crop&q=60",
		quote: "We scaled from 10 to 100 stores without changing our software. That says it all.",
	},
];

export function TestimonialsCarousel() {
	const [activeIndex, setActiveIndex] = useState(2);

	const nextTestimonial = () => {
		setActiveIndex((prev) => (prev + 1) % testimonials.length);
	};

	const prevTestimonial = () => {
		setActiveIndex(
			(prev) => (prev - 1 + testimonials.length) % testimonials.length,
		);
	};

	const CLIP_PATH = "polygon(0 0, calc(100% - 40px) 0, 100% 40px, 100% 100%, 0 100%)";

	const getCardStyle = (index: number) => {
		const diff = (index - activeIndex + testimonials.length) % testimonials.length;
		const adjustedDiff = diff > testimonials.length / 2 ? diff - testimonials.length : diff;

		if (adjustedDiff === 0) {
			return {
				zIndex: 50,
				x: 0,
				y: 0,
				scale: 1,
				rotate: 0,
				opacity: 1,
				innerBackgroundColor: "#4F46E5",
				innerColor: "white",
				filter: "drop-shadow(0 10px 0px var(--border-color))",
			};
		}

		const absDiff = Math.abs(adjustedDiff);
		const isRight = adjustedDiff > 0;
		
		// Random-looking but deterministic rotations based on index
		const randomRotations = [4, -3, 5, -5, 3, -4, 2, -6, 4, -2];
		const rotation = randomRotations[index % randomRotations.length];
		
		// Random-looking vertical offsets
		const randomY = [10, -10, 5, -15, 8, -5, 12, -8, 6, -12];
		const yOffset = randomY[index % randomY.length];

		return {
			zIndex: 50 - absDiff,
			x: isRight ? `${absDiff * 30 + 10}%` : `${-absDiff * 30 - 10}%`, // Reduced spacing for cluster effect
			y: yOffset,
			scale: 1 - absDiff * 0.05,
			rotate: rotation + (isRight ? 2 : -2),
			opacity: absDiff > 4 ? 0 : 1, // Show more cards
			innerBackgroundColor: "white",
			innerColor: "black",
			filter: "drop-shadow(0 10px 0px var(--border-color))",
		};
	};

	return (
		<section className="py-24 overflow-hidden bg-neutral-100 dark:bg-neutral-900">
			<div className="container mx-auto px-4">
				<div className="mb-16 text-center">
					<h2 className="text-4xl font-black uppercase tracking-tight md:text-6xl">
						Trusted by{" "}
						<span className="bg-[var(--color-accent)] px-2 text-black border-2 border-black inline-block transform rotate-1">
							Leaders
						</span>
					</h2>
				</div>

				<div className="relative mx-auto h-[450px] max-w-7xl">
					<div className="relative flex h-full items-center justify-center">
						<AnimatePresence mode="popLayout">
							{testimonials.map((testimonial, index) => {
								const style = getCardStyle(index);
								// Only render visible cards
								if (style.opacity === 0) return null;

								const { innerBackgroundColor, innerColor, ...outerStyle } = style;

								return (
									<motion.div
										key={testimonial.id}
										className={cn(
											"absolute w-[400px] md:w-[500px] min-h-[350px] transition-colors duration-500 [--border-color:black] dark:[--border-color:white]",
										)}
										initial={false}
										animate={outerStyle}
										transition={{
											type: "spring",
											stiffness: 200,
											damping: 20,
										}}
										style={{
											clipPath: CLIP_PATH,
											backgroundColor: "var(--border-color)",
											padding: "3px",
										}}
									>
										<motion.div
											className="flex h-full w-full flex-col justify-between p-8"
											animate={{
												backgroundColor: innerBackgroundColor,
												color: innerColor,
											}}
											style={{
												clipPath: CLIP_PATH,
											}}
										>
											<div className="mb-6">
												<div className="relative size-16 overflow-hidden rounded-lg border-2 border-current mb-4">
													<Image
														src={testimonial.image}
														alt={testimonial.name}
														fill
														className="object-cover"
													/>
												</div>
												<Quote className="size-8 opacity-50 mb-2" />
												<p className="text-xl font-bold leading-tight md:text-2xl">
													"{testimonial.quote}"
												</p>
											</div>

											<div className="mt-auto pt-6 border-t border-current/20">
												<p className="font-bold uppercase tracking-wider text-sm">
													- {testimonial.name}
												</p>
												<p className="text-xs opacity-70 font-medium mt-1">
													{testimonial.role}
												</p>
											</div>
										</motion.div>
									</motion.div>
								);
							})}
						</AnimatePresence>
					</div>
				</div>

				<div className="mt-12 flex justify-center gap-4">
					<button
						onClick={prevTestimonial}
						className="flex size-12 items-center justify-center rounded-full border-2 border-black bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-y-1 hover:shadow-none active:translate-y-2 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
					>
						<ArrowLeft className="size-6" />
					</button>
					<button
						onClick={nextTestimonial}
						className="flex size-12 items-center justify-center rounded-full border-2 border-black bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-y-1 hover:shadow-none active:translate-y-2 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
					>
						<ArrowRight className="size-6" />
					</button>
				</div>
			</div>
		</section>
	);
}
