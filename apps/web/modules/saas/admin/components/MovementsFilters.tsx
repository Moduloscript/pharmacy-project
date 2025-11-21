"use client";

import React from "react";
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
	return (
		<Card className="p-3 bg-muted/8 rounded-lg">
			<div className="flex flex-wrap items-center gap-3">
				<div className="flex items-center gap-2 min-w-[160px]">
					<Label className="!mb-0">Type</Label>
					<Select
						value={typeFilter}
						onValueChange={(v) => setTypeFilter(v as MovementType)}
					>
						<SelectTrigger className="min-w-[110px]">
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

				<div className="flex items-center gap-2 min-w-[220px]">
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

				<div className="flex items-center gap-2 min-w-[220px]">
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

				<div className="flex items-center gap-2">
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

				<div className="flex items-center gap-2 ml-auto">
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

				<div className="w-full flex items-center justify-end mt-2">
					<div className="text-xs text-muted-foreground mr-4">
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
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page <= 1}
							className="h-9"
						>
							Prev
						</Button>
						<Button
							variant="outline"
							onClick={() =>
								setPage((p) => Math.min(totalPages, p + 1))
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
			</div>
		</Card>
	);
}
