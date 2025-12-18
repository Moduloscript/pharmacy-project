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
			<div className="p-4 border-b flex items-center justify-between">
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
				<div className="flex gap-2">
					<Button
						variant="outline"
						onClick={fetchData}
						disabled={loading}
					>
						Refresh
					</Button>
					<Button variant="outline" onClick={handleExport}>
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
						{/* Mobile Card View */}
						<div className="md:hidden space-y-3">
							{items.map((m) => (
								<div
									key={m.id}
									className="rounded-lg border p-4 space-y-2"
									style={{
										backgroundColor: "var(--rx-surface)",
										borderColor: "var(--rx-border)",
									}}
								>
									{/* Header: Type Badge + Date */}
									<div className="flex items-center justify-between">
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
										<span className="text-xs text-muted-foreground">
											{new Date(m.createdAt).toLocaleString()}
										</span>
									</div>

									{/* Quantity - Large Display */}
									<div className="flex items-baseline gap-2">
										<span className="text-2xl font-bold" style={{ color: "var(--rx-text)" }}>
											{m.type === "OUT" ? "-" : m.type === "IN" ? "+" : ""}
											{Math.abs(m.quantity)}
										</span>
										<span className="text-sm text-muted-foreground">
											{m.previousStock} → {m.newStock}
										</span>
									</div>

									{/* Details Grid */}
									<div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
										{m.reason && (
											<>
												<span className="text-muted-foreground">Reason</span>
												<span style={{ color: "var(--rx-text)" }}>{m.reason}</span>
											</>
										)}
										{m.batchNumber && (
											<>
												<span className="text-muted-foreground">Batch</span>
												<span style={{ color: "var(--rx-text)" }}>{m.batchNumber}</span>
											</>
										)}
										{m.expiryDate && (
											<>
												<span className="text-muted-foreground">Expiry</span>
												<span style={{ color: "var(--rx-text)" }}>
													{new Date(m.expiryDate).toLocaleDateString()}
												</span>
											</>
										)}
									</div>

									{/* Notes - Truncated */}
									{m.notes && (
										<p
											className="text-xs text-muted-foreground truncate"
											title={m.notes}
										>
											{m.notes}
										</p>
									)}
								</div>
							))}
						</div>

						{/* Desktop Table View */}
						<div className="hidden md:block">
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
