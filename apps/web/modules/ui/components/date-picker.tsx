"use client";

import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import * as React from "react";

import { cn } from "@ui/lib";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

interface DatePickerProps {
	value?: Date | number;
	onChange?: (value: Date | undefined) => void;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
	mode?: "full" | "year-only";
}

export function DatePicker({
	value,
	onChange,
	placeholder = "Select date",
	disabled = false,
	className,
	mode = "full",
}: DatePickerProps) {
	const [open, setOpen] = React.useState(false);
	const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
		value instanceof Date ? value : value ? new Date(value, 0, 1) : undefined
	);

	// For year-only mode, show a simplified year selector
	if (mode === "year-only") {
		const currentYear = new Date().getFullYear();
		const years = Array.from({ length: currentYear - 1899 }, (_, i) => currentYear - i);
		const selectedYear = selectedDate ? selectedDate.getFullYear() : undefined;

		return (
			<Select
				value={selectedYear?.toString()}
				onValueChange={(yearStr) => {
					const year = parseInt(yearStr);
					const date = new Date(year, 0, 1);
					setSelectedDate(date);
					onChange?.(date);
				}}
				disabled={disabled}
			>
				<SelectTrigger className={cn("w-full", className)}>
					<div className="flex items-center space-x-2">
						<CalendarIcon className="h-4 w-4 text-muted-foreground" />
						<SelectValue placeholder={placeholder} />
					</div>
				</SelectTrigger>
				<SelectContent className="max-h-[200px]">
					{years.map((year) => (
						<SelectItem key={year} value={year.toString()}>
							{year}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		);
	}

	// Full calendar mode
	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					className={cn(
						"w-full justify-start text-left font-normal",
						!selectedDate && "text-muted-foreground",
						className
					)}
					disabled={disabled}
				>
					<CalendarIcon className="mr-2 h-4 w-4" />
					{selectedDate ? format(selectedDate, "PPP") : <span>{placeholder}</span>}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="single"
					selected={selectedDate}
					onSelect={(date) => {
						setSelectedDate(date);
						onChange?.(date);
						setOpen(false);
					}}
					initialFocus
					disabled={(date) => date > new Date()}
				/>
			</PopoverContent>
		</Popover>
	);
}

// Specialized component for establishment year selection
interface YearEstablishedPickerProps {
	value?: number;
	onChange?: (value: number | undefined) => void;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
}

export function YearEstablishedPicker({
	value,
	onChange,
	placeholder = "Select year established",
	disabled = false,
	className,
}: YearEstablishedPickerProps) {
	const currentYear = new Date().getFullYear();
	const years = Array.from({ length: currentYear - 1899 }, (_, i) => currentYear - i);

	return (
		<Select
			value={value?.toString()}
			onValueChange={(yearStr) => {
				const year = yearStr ? parseInt(yearStr) : undefined;
				onChange?.(year);
			}}
			disabled={disabled}
		>
			<SelectTrigger className={cn("w-full", className)}>
				<div className="flex items-center space-x-2">
					<CalendarIcon className="h-4 w-4 text-muted-foreground" />
					<SelectValue placeholder={placeholder} />
				</div>
			</SelectTrigger>
			<SelectContent className="max-h-[200px]">
				{years.map((year) => (
					<SelectItem key={year} value={year.toString()}>
						{year}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
