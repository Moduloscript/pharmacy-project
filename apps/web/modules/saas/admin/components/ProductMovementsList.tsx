"use client";

import { useEffect, useMemo, useState } from "react";
import MovementsFilters from "./MovementsFilters";
import MovementsTable, { type InventoryMovement } from "./MovementsTable";

export function ProductMovementsList({ productId }: { productId: string }) {
	const [items, setItems] = useState<InventoryMovement[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Filters + pagination
	const [typeFilter, setTypeFilter] = useState<
		"all" | "IN" | "OUT" | "ADJUSTMENT"
	>("all");
	const [from, setFrom] = useState<string>("");
	const [to, setTo] = useState<string>("");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [total, setTotal] = useState(0);

	const fetchData = async () => {
		setLoading(true);
		setError(null);
		try {
			const params = new URLSearchParams();
			params.set("page", String(page));
			params.set("pageSize", String(pageSize));
			if (typeFilter !== "all") {
				params.append("type", typeFilter);
			}
			if (from) {
				const start = new Date(from);
				start.setHours(0, 0, 0, 0);
				params.set("dateFrom", start.toISOString());
			}
			if (to) {
				const end = new Date(to);
				end.setHours(23, 59, 59, 999);
				params.set("dateTo", end.toISOString());
			}

			const res = await fetch(
				`/api/admin/products/${productId}/movements?${params.toString()}`,
				{
					credentials: "include",
				},
			);
			if (!res.ok) {
				throw new Error(`Failed to load movements (${res.status})`);
			}
			const data = await res.json();
			const list = Array.isArray(data?.data) ? data.data : [];
			setItems(list);
			const meta = data?.meta;
			setTotal(
				typeof meta?.total === "number"
					? meta.total
					: (page - 1) * pageSize + list.length,
			);
		} catch (e: any) {
			setError(e.message || "Failed to load movements");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
		const onUpdated = () => fetchData();
		if (typeof window !== "undefined") {
			window.addEventListener("inventory:updated", onUpdated);
		}
		return () => {
			if (typeof window !== "undefined") {
				window.removeEventListener("inventory:updated", onUpdated);
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [page, pageSize, typeFilter, from, to]);

	const totals = useMemo(() => {
		const net = items.reduce(
			(sum, m) => sum + (Number(m.quantity) || 0),
			0,
		);
		return { net };
	}, [items]);

	const totalPages = useMemo(
		() => Math.max(1, Math.ceil(total / pageSize)),
		[total, pageSize],
	);
	const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
	const rangeEnd = total === 0 ? 0 : Math.min(total, page * pageSize);

	return (
		<div className="space-y-4">
			<MovementsFilters
				typeFilter={typeFilter}
				setTypeFilter={(v) => setTypeFilter(v as any)}
				from={from}
				setFrom={setFrom}
				to={to}
				setTo={setTo}
				page={page}
				setPage={setPage}
				pageSize={pageSize}
				setPageSize={setPageSize}
				fetchData={fetchData}
				loading={loading}
				onReset={() => {
					setTypeFilter("all");
					setFrom("");
					setTo("");
					setPage(1);
					setPageSize(20);
				}}
				total={total}
				rangeStart={rangeStart}
				rangeEnd={rangeEnd}
				totalPages={totalPages}
			/>

			{error && (
				<div className="p-4 bg-red-50 border-red-200 text-red-700 text-sm rounded">
					{error}
				</div>
			)}

			<MovementsTable
				items={items}
				loading={loading}
				totals={totals}
				productId={productId}
				fetchData={fetchData}
			/>
		</div>
	);
}

export default ProductMovementsList;
