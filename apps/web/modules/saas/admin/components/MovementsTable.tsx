"use client";

import React from "react";
import { Card } from "@ui/components/card";
import { Button } from "@ui/components/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@ui/components/table";
import { Badge } from "@ui/components/badge";
import { Activity } from "lucide-react";

export interface InventoryMovement {
	id: string;
	type: string;
	quantity: number;
	reason?: string | null;
	previousStock: number;
	newStock: number;
	batchNumber?: string | null;
	expiryDate?: string | null;
	userId?: string | null;
	notes?: string | null;
	createdAt: string;
}

interface Props {
	items: InventoryMovement[];
	loading: boolean;
	totals: { net: number };
	productId: string;
	fetchData: () => void;
}

export default function MovementsTable({
	items,
	loading,
	totals,
	productId,
	fetchData,
}: Props) {
	const handleExport = () => {
		const headers = [
			"createdAt",
			"type",
			"quantity",
			"previousStock",
			"newStock",
			"reason",
			"batchId",
			"notes",
		];
		const rows = items.map((m) => [
			new Date(m.createdAt).toISOString(),
			m.type,
			String(m.quantity),
			String(m.previousStock),
			String(m.newStock),
			m.reason ?? "",
			(m as any).batchId ?? "",
			(m.notes ?? "").replace(/\n/g, " "),
		]);
		const csv = [
			headers.join(","),
			...rows.map((r) =>
				r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
			),
		].join("\n");
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `movements-${productId}-${new Date().toISOString().slice(0, 10)}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<Card>
			<div className="p-4 border-b flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
				<div>
					<h3 className="text-lg md:text-xl font-semibold flex items-center gap-2">
						<Activity className="h-5 w-5 text-muted-foreground" />
						Movements
					</h3>
					<p className="text-sm text-muted-foreground">
						{items.length} record(s) • Net change: {totals.net}
					</p>
					<p className="text-xs text-muted-foreground mt-1">
						Tip: Use Export CSV for reconciliation. Types: IN
						(increase), OUT (decrease), ADJUSTMENT (manual).
					</p>
				</div>
				<div className="flex gap-2 w-full md:w-auto">
					<Button
						variant="outline"
						onClick={fetchData}
						disabled={loading}
						className="flex-1 md:flex-none"
					>
						Refresh
					</Button>
					<Button variant="outline" onClick={handleExport} className="flex-1 md:flex-none">
						Export CSV
					</Button>
				</div>
			</div>

			<div className="p-4">
				{loading ? (
					<div className="text-sm text-muted-foreground">
						Loading movements…
					</div>
				) : items.length === 0 ? (
					<div className="text-sm text-muted-foreground">
						No movements found.
					</div>
				) : (
					<>
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Date</TableHead>
									<TableHead>Type</TableHead>
									<TableHead className="text-right">
										Qty
									</TableHead>
									<TableHead>From → To</TableHead>
									<TableHead>Reason</TableHead>
									<TableHead>Batch</TableHead>
									<TableHead>Expiry</TableHead>
									<TableHead>Notes</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{items.map((m) => (
									<TableRow
										key={m.id}
										className="hover:bg-muted/6 transition-colors"
									>
										<TableCell className="whitespace-nowrap">
											{new Date(m.createdAt).toLocaleString()}
										</TableCell>
										<TableCell>
											<Badge
												status={
													m.type === "IN"
														? "success"
														: m.type === "OUT"
															? "error"
															: "info"
												}
											>
												{m.type}
											</Badge>
										</TableCell>
										<TableCell className="text-right font-medium">
											{m.quantity}
										</TableCell>
										<TableCell>
											{m.previousStock} → {m.newStock}
										</TableCell>
										<TableCell>{m.reason || "—"}</TableCell>
										<TableCell>
											{m.batchNumber || "—"}
										</TableCell>
										<TableCell>
											{m.expiryDate
												? new Date(
														m.expiryDate,
													).toLocaleDateString()
												: "—"}
										</TableCell>
										<TableCell
											className="max-w-[400px] truncate"
											title={m.notes || undefined}
										>
											{m.notes || "—"}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
					</>
				)}
			</div>
		</Card>
	);
}
