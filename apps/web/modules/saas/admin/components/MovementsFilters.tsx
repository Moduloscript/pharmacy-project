"use client";

import React, { useState } from "react";
import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import { Label } from "@ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import { DatePicker } from "@ui/components/date-picker";
import { Filter, ChevronDown, ChevronUp } from "lucide-react";

export type MovementType = "all" | "IN" | "OUT" | "ADJUSTMENT";

interface Props {
	typeFilter: MovementType;
	setTypeFilter: (v: MovementType) => void;
	from: string;
	setFrom: (v: string) => void;
	to: string;
	setTo: (v: string) => void;
	page: number;
	setPage: (n: number) => void;
	pageSize: number;
	setPageSize: (n: number) => void;
	fetchData: () => void;
	loading: boolean;
	onReset: () => void;
	total: number;
	rangeStart: number;
	rangeEnd: number;
	totalPages: number;
}

export default function MovementsFilters({
	typeFilter,
	setTypeFilter,
	from,
	setFrom,
	to,
	setTo,
	page,
	setPage,
	pageSize,
	setPageSize,
	fetchData,
	loading,
	onReset,
	total,
	rangeStart,
	rangeEnd,
	totalPages,
}: Props) {
	const [showAdvanced, setShowAdvanced] = useState(false);

	return (
		<Card className="p-3 bg-muted/8 rounded-lg space-y-3">
			{/* Primary Row: Type Filter + Expand Toggle (Mobile) or Full Filters (Desktop) */}
			<div className="flex flex-wrap items-center gap-3">
				{/* Type Filter - Always visible */}
				<div className="flex items-center gap-2 min-w-[160px]">
					<Label className="!mb-0">Type</Label>
					<Select
						value={typeFilter}
						onValueChange={(v) => setTypeFilter(v as MovementType)}
					>
						<SelectTrigger className="min-w-[110px] h-10 md:h-9">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All</SelectItem>
							<SelectItem value="IN">IN</SelectItem>
							<SelectItem value="OUT">OUT</SelectItem>
							<SelectItem value="ADJUSTMENT">
								ADJUSTMENT
							</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* Mobile: Expand Advanced Filters Button */}
				<Button
					variant="outline"
					size="sm"
					className="md:hidden h-10 gap-2"
					onClick={() => setShowAdvanced(!showAdvanced)}
				>
					<Filter className="h-4 w-4" />
					Filters
					{showAdvanced ? (
						<ChevronUp className="h-4 w-4" />
					) : (
						<ChevronDown className="h-4 w-4" />
					)}
				</Button>

				{/* Desktop: Date Filters - Always visible on desktop */}
				<div className="hidden md:flex items-center gap-2 min-w-[220px]">
					<Label className="!mb-0">From</Label>
					<DatePicker
						aria-label="Start date"
						value={from ? new Date(from) : undefined}
						onChange={(d) =>
							setFrom(d ? d.toISOString().slice(0, 10) : "")
						}
						placeholder="Start"
						className="h-9"
					/>
				</div>

				<div className="hidden md:flex items-center gap-2 min-w-[220px]">
					<Label className="!mb-0">To</Label>
					<DatePicker
						aria-label="End date"
						value={to ? new Date(to) : undefined}
						onChange={(d) =>
							setTo(d ? d.toISOString().slice(0, 10) : "")
						}
						placeholder="End"
						className="h-9"
					/>
				</div>

				<div className="hidden md:flex items-center gap-2">
					<Label className="!mb-0">Page size</Label>
					<Select
						value={String(pageSize)}
						onValueChange={(v) => {
							setPageSize(Number.parseInt(v));
							setPage(1);
						}}
					>
						<SelectTrigger className="w-[96px] h-9">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="10">10</SelectItem>
							<SelectItem value="20">20</SelectItem>
							<SelectItem value="50">50</SelectItem>
							<SelectItem value="100">100</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* Desktop: Action Buttons */}
				<div className="hidden md:flex items-center gap-2 ml-auto">
					<Button
						onClick={fetchData}
						disabled={loading}
						className="h-9"
					>
						{loading ? "Loading…" : "Apply"}
					</Button>
					<Button variant="outline" onClick={onReset} className="h-9">
						Reset
					</Button>
				</div>
			</div>

			{/* Mobile: Collapsible Advanced Filters */}
			{showAdvanced && (
				<div className="md:hidden space-y-3 pt-2 border-t" style={{ borderColor: "var(--rx-border)" }}>
					<div className="flex items-center gap-2">
						<Label className="!mb-0 min-w-[50px]">From</Label>
						<DatePicker
							aria-label="Start date"
							value={from ? new Date(from) : undefined}
							onChange={(d) =>
								setFrom(d ? d.toISOString().slice(0, 10) : "")
							}
							placeholder="Start"
							className="h-10 flex-1"
						/>
					</div>

					<div className="flex items-center gap-2">
						<Label className="!mb-0 min-w-[50px]">To</Label>
						<DatePicker
							aria-label="End date"
							value={to ? new Date(to) : undefined}
							onChange={(d) =>
								setTo(d ? d.toISOString().slice(0, 10) : "")
							}
							placeholder="End"
							className="h-10 flex-1"
						/>
					</div>

					<div className="flex items-center gap-2">
						<Label className="!mb-0 min-w-[50px]">Per page</Label>
						<Select
							value={String(pageSize)}
							onValueChange={(v) => {
								setPageSize(Number.parseInt(v));
								setPage(1);
							}}
						>
							<SelectTrigger className="w-full h-10">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="10">10</SelectItem>
								<SelectItem value="20">20</SelectItem>
								<SelectItem value="50">50</SelectItem>
								<SelectItem value="100">100</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="flex gap-2">
						<Button
							onClick={fetchData}
							disabled={loading}
							className="h-10 flex-1"
						>
							{loading ? "Loading…" : "Apply"}
						</Button>
						<Button variant="outline" onClick={onReset} className="h-10 flex-1">
							Reset
						</Button>
					</div>
				</div>
			)}

			{/* Pagination Row */}
			<div className="flex flex-col md:flex-row items-center justify-between gap-2 pt-2 border-t" style={{ borderColor: "var(--rx-border)" }}>
				<div className="text-xs text-muted-foreground">
					Page {page} of {totalPages} • Showing {rangeStart}–
					{rangeEnd} of {total}
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						onClick={() => setPage(1)}
						disabled={page <= 1}
						className="h-9"
					>
						First
					</Button>
					<Button
						variant="outline"
						onClick={() => setPage(Math.max(1, page - 1))}
						disabled={page <= 1}
						className="h-9"
					>
						Prev
					</Button>
					<Button
						variant="outline"
						onClick={() =>
							setPage(Math.min(totalPages, page + 1))
						}
						disabled={page >= totalPages}
						className="h-9"
					>
						Next
					</Button>
					<Button
						variant="outline"
						onClick={() => setPage(totalPages)}
						disabled={page >= totalPages}
						className="h-9"
					>
						Last
					</Button>
				</div>
			</div>
		</Card>
	);
}

