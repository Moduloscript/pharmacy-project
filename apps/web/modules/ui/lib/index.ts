import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// Pluralization helper used across UI for consistent copy
// pluralize(1, 'item') => 'item'
// pluralize(2, 'item') => 'items'
// pluralize(2, 'person', 'people') => 'people'
export function pluralize(count: number, singular: string, pluralOverride?: string) {
	if (count === 1) return singular;
	return pluralOverride ?? `${singular}s`;
}
