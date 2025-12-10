import { cn } from "@ui/lib";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type React from "react";

export const badge = cva(
	[
		"inline-block",
		"rounded-full",
		"px-2.5",
		"py-1",
		"text-xs",
		"font-medium",
		"leading-tight",
	],
	{
		variants: {
			variant: {
				default: ["bg-primary", "text-primary-foreground"],
				secondary: ["bg-secondary", "text-secondary-foreground"],
				destructive: ["bg-destructive", "text-destructive-foreground"],
				outline: ["border", "border-border", "text-foreground"],
				success: ["bg-success/10", "text-success"],
				info: ["bg-primary/10", "text-primary"],
				warning: ["bg-highlight/10", "text-highlight"],
				error: ["bg-destructive/10", "text-destructive"],
				primary: ["bg-primary", "text-primary-foreground"],
			},
		},
		defaultVariants: {
			variant: "info",
		},
	},
);

export type BadgeProps = React.HtmlHTMLAttributes<HTMLDivElement> &
	VariantProps<typeof badge> & {
		status?: "success" | "info" | "warning" | "error";
	};

export const Badge = ({
	children,
	className,
	status,
	variant,
	...props
}: BadgeProps) => {
	const finalVariant = variant || status || "info";
	return (
		<span className={cn(badge({ variant: finalVariant }), className)} {...props}>
			{children}
		</span>
	);
};

Badge.displayName = "Badge";
