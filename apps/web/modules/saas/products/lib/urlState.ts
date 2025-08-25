"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAtom } from "jotai";
import { productFiltersAtom, updateFiltersAtom, viewModeAtom, densityAtom, setSearchQueryAtom } from "./store";

function toBool(val: string | null | undefined): boolean | undefined {
  if (val === undefined || val === null) return undefined;
  if (val === "true") return true;
  if (val === "false") return false;
  return undefined;
}

export function useProductsURLStateSync() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useAtom(productFiltersAtom);
  const [, updateFilters] = useAtom(updateFiltersAtom);
  const [view, setView] = useAtom(viewModeAtom);
  const [density, setDensity] = useAtom(densityAtom);
  const [, setSearch] = useAtom(setSearchQueryAtom);

  const didHydrateFromURL = useRef(false);

  // Hydrate atoms from URL on first mount
  useEffect(() => {
    if (didHydrateFromURL.current) return;
    const params = searchParams;

    const page = params.get("page");
    const limit = params.get("limit");
    const search = params.get("search") ?? params.get("q");
    const category = params.get("category");
    const min_price = params.get("min_price");
    const max_price = params.get("max_price");
    const prescription_only = params.get("prescription_only");
    const in_stock_only = params.get("in_stock_only");
    const sort = params.get("sort");
    const viewParam = params.get("view") as "grid" | "list" | null;
    const densityParam = params.get("density") as "comfortable" | "compact" | null;

    const nextFilters = {
      page: page ? Number(page) : filters.page,
      limit: limit ? Number(limit) : filters.limit,
      search: search || undefined,
      category: category || undefined,
      min_price: min_price ? Number(min_price) : undefined,
      max_price: max_price ? Number(max_price) : undefined,
      prescription_only: toBool(prescription_only),
      in_stock_only: toBool(in_stock_only),
      sort: sort || undefined,
    };

    updateFilters(nextFilters);
    if (search) setSearch(search);
    if (viewParam === "grid" || viewParam === "list") setView(viewParam);
    if (densityParam === "comfortable" || densityParam === "compact") setDensity(densityParam);

    didHydrateFromURL.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push atoms to URL when they change
  useEffect(() => {
    if (!didHydrateFromURL.current) return;
    const params = new URLSearchParams();

    if (filters.page) params.set("page", String(filters.page));
    if (filters.limit) params.set("limit", String(filters.limit));
    if (filters.search) params.set("search", String(filters.search));
    if (filters.category) params.set("category", String(filters.category));
    if (filters.min_price !== undefined) params.set("min_price", String(filters.min_price));
    if (filters.max_price !== undefined) params.set("max_price", String(filters.max_price));
    if (filters.prescription_only !== undefined) params.set("prescription_only", String(filters.prescription_only));
    if (filters.in_stock_only !== undefined) params.set("in_stock_only", String(filters.in_stock_only));
    if (filters.sort) params.set("sort", filters.sort);

    params.set("view", view);
    params.set("density", density);

    const qs = params.toString();
    router.replace(`?${qs}`);
  }, [filters, view, density, router]);
}
