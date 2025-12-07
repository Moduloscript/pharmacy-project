/**
 * Animation utilities for Framer Motion
 * Pharma-appropriate timing and easing for professional, trustworthy animations
 */

import type { Variants } from "framer-motion";

// Pharma-appropriate timing
export const timing = {
	fast: 0.3,
	medium: 0.5,
	slow: 0.9,
} as const;

// Smooth easing for professional feel
export const easing = [0.25, 0.1, 0.25, 1] as const;

/**
 * Fade in animation
 */
export const fadeIn: Variants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			duration: timing.medium,
			ease: easing,
		},
	},
};

/**
 * Fade in with slide up
 */
export const fadeInUp: Variants = {
	hidden: { opacity: 0, y: 20 },
	visible: {
		opacity: 1,
		y: 0,
		transition: {
			duration: timing.slow,
			ease: easing,
		},
	},
};

/**
 * Fade in with slide from left
 */
export const fadeInLeft: Variants = {
	hidden: { opacity: 0, x: -30 },
	visible: {
		opacity: 1,
		x: 0,
		transition: {
			duration: timing.medium,
			ease: easing,
		},
	},
};

/**
 * Fade in with slide from right
 */
export const fadeInRight: Variants = {
	hidden: { opacity: 0, x: 30 },
	visible: {
		opacity: 1,
		x: 0,
		transition: {
			duration: timing.medium,
			ease: easing,
		},
	},
};

/**
 * Scale animation for cards
 */
export const scaleIn: Variants = {
	hidden: { opacity: 0, scale: 0.95 },
	visible: {
		opacity: 1,
		scale: 1,
		transition: {
			duration: timing.medium,
			ease: easing,
		},
	},
};

/**
 * Stagger children animation
 */
export const staggerContainer: Variants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.15,
			delayChildren: 0.1,
		},
	},
};

/**
 * Stagger item animation
 */
export const staggerItem: Variants = {
	hidden: { opacity: 0, y: 20 },
	visible: {
		opacity: 1,
		y: 0,
		transition: {
			duration: timing.medium,
			ease: easing,
		},
	},
};

/**
 * Hover lift effect for cards
 */
export const hoverLift = {
	scale: 1.02,
	y: -4,
	transition: {
		duration: timing.fast,
		ease: easing,
	},
};

/**
 * Hover scale for buttons
 */
export const hoverScale = {
	scale: 1.05,
	transition: {
		duration: timing.fast,
		ease: easing,
	},
};

/**
 * Pulse animation for badges
 */
export const pulse: Variants = {
	initial: { scale: 1 },
	animate: {
		scale: [1, 1.05, 1],
		transition: {
			duration: 2,
			repeat: Number.POSITIVE_INFINITY,
			ease: easing,
		},
	},
};

/**
 * Floating animation for hero images
 */
export const float: Variants = {
	initial: { y: 0 },
	animate: {
		y: [-10, 10, -10],
		transition: {
			duration: 6,
			repeat: Number.POSITIVE_INFINITY,
			ease: easing,
		},
	},
};

/**
 * Gradient orb animation
 */
export const gradientOrb: Variants = {
	initial: { scale: 1, opacity: 0.2 },
	animate: {
		scale: [1, 1.1, 1],
		opacity: [0.2, 0.3, 0.2],
		transition: {
			duration: 8,
			repeat: Number.POSITIVE_INFINITY,
			ease: easing,
		},
	},
};

/**
 * Check if user prefers reduced motion
 */
export const prefersReducedMotion = () => {
	if (typeof window === "undefined") return false;
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

/**
 * Get animation props with reduced motion support
 */
export const getAnimationProps = (variants: Variants) => {
	if (prefersReducedMotion()) {
		return {};
	}
	return {
		initial: "hidden",
		whileInView: "visible",
		viewport: { once: true, margin: "-100px" },
		variants,
	};
};
