# PR: Fix inventory optimistic stock updates

Summary:
Implements optimistic React Query cache updates for product stock changes and adds a local-controlled `ProductStockInput` that saves on blur/Enter to improve typing UX.

Branch: `fix/inventory-optimistic-stock`

Testing:
- Run `pnpm run dev` and open `/app/admin/inventory`.
- Edit a product's stock and blur/press Enter — the UI should update immediately and show "Saving..." during the mutation.

Remote PR URL (auto-generated after push):
https://github.com/Moduloscript/pharmacy-project/pull/new/fix/inventory-optimistic-stock
