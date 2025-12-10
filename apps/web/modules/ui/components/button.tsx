import { Slot, Slottable } from "@radix-ui/react-slot";
import * as React from "react";

import { Spinner } from "@shared/components/Spinner";
import { cn } from "@ui/lib";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";

const buttonVariants = cva(
	"flex items-center justify-center border-2 font-bold uppercase tracking-wide transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&>svg]:mr-1.5 [&>svg]:opacity-60 [&>svg+svg]:hidden active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
	{
		variants: {
			variant: {
				primary:
					"border-black bg-[var(--color-accent)] text-black shadow-[var(--shadow-hard)] hover:bg-[var(--color-accent)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000] dark:border-white dark:shadow-[var(--shadow-hard)] dark:hover:shadow-[6px_6px_0px_0px_#fff]",
				error: "bg-destructive text-destructive-foreground border-destructive shadow-[var(--shadow-hard)] hover:bg-destructive/90",
				outline:
					"border-black bg-transparent text-foreground shadow-[var(--shadow-hard)] hover:bg-accent hover:text-accent-foreground dark:border-white",
				secondary:
					"border-black bg-white text-black shadow-[var(--shadow-hard)] hover:bg-gray-100 dark:border-white",
				ghost: "border-transparent text-primary hover:bg-primary/10 hover:text-primary",
				link: "border-transparent text-primary underline-offset-4 hover:underline",
				default:
					"border-black bg-[var(--color-accent)] text-black shadow-[var(--shadow-hard)] hover:bg-[var(--color-accent)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000] dark:border-white dark:shadow-[var(--shadow-hard)] dark:hover:shadow-[6px_6px_0px_0px_#fff]",
				destructive: "bg-destructive text-destructive-foreground border-destructive shadow-[var(--shadow-hard)] hover:bg-destructive/90",
			},
			size: {
				md: "h-12 px-6 text-sm",
				sm: "h-10 px-4 text-xs",
				lg: "h-14 px-8 text-base",
				icon: "size-12 [&>svg]:m-0 [&>svg]:opacity-100",
			},
		},
		defaultVariants: {
			variant: "primary",
			size: "md",
		},
	},
);

export type ButtonProps = {
	asChild?: boolean;
	loading?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement> &
	VariantProps<typeof buttonVariants>;

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			className,
			children,
			variant,
			size,
			asChild = false,
			loading,
			disabled,
			...props
		},
		ref,
	) => {
		const Comp = asChild ? Slot : "button";
		return (
			<Comp
				className={cn(buttonVariants({ variant, size, className }))}
				ref={ref}
				disabled={disabled || loading}
				{...props}
			>
				{loading && <Spinner className="mr-1.5 size-4 text-inherit" />}
				<Slottable>{children}</Slottable>
			</Comp>
		);
	},
);
Button.displayName = "Button";

export { Button, buttonVariants };
