# Fix: Optimistic stock updates + ProductStockInput UX

## Summary
Implements optimistic React Query updates for product stock changes so inventory numbers update immediately in the admin UI without a full page refresh. Adds a local-controlled `ProductStockInput` that saves on blur or Enter for better typing UX.

## Changes
- `apps/web/modules/saas/admin/components/InventoryTable.tsx`
  - Added `ProductStockInput` local-controlled input.
  - Uses existing `useUpdateStock` mutation which now performs optimistic cache updates.
  - UX improvement: save-on-blur/Enter and small "Saving..." indicator.
- Lint/style cleanups in the same file.

## Testing
1. Run dev server: `pnpm run dev`
2. Open: `/app/admin/inventory`
3. Edit a product's stock, then blur or press Enter — UI should update immediately and show "Saving..." while the mutation runs.

## Notes
- The branch: `fix/inventory-optimistic-stock`
- Remote PR creation URL: https://github.com/Moduloscript/pharmacy-project/pull/new/fix/inventory-optimistic-stock

Please review and merge to master after verification.
