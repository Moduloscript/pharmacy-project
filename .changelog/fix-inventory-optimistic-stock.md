# Fix: Optimistic stock updates + ProductStockInput UX

- Implement optimistic React Query updates for product stock changes so inventory numbers update immediately in the admin UI without requiring a full page refresh.
- Add `ProductStockInput` local-controlled input (save on blur / Enter) to improve typing UX and avoid updating the server on every keystroke.
- Add small 'Saving...' indicator while changes persist to the server.
- Lint/style fixes in `InventoryTable.tsx`.

Files changed:
- `apps/web/modules/saas/admin/components/InventoryTable.tsx`

Why:
- The admin inventory page previously required a manual refresh to show updated stock. Optimistic updates and a local input UX provide immediate feedback and better user experience.

Notes:
- The update uses the existing `PUT /api/admin/products/:id/stock` endpoint.
- After merging, please run the dev server and verify behavior: `pnpm run dev` and visit `/app/admin/inventory`.
