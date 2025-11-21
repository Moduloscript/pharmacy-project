# Inventory Module

This document describes the core admin inventory features and their API endpoints, along with how the web app wires to them.

## Endpoints

- GET /api/admin/products
  - List products for inventory management (supports search, category, stockStatus on server + client filters)
  - Used by: InventoryTable

- GET /api/admin/products/:id
  - Product details for editing
  - Used by: ProductDetails page, ProductEditForm

- PUT /api/admin/products/:id
  - Update product fields
  - Used by: ProductEditForm

- PUT /api/admin/products/:id/stock
  - Directly set stock quantity (creates an ADJUSTMENT movement server-side)
  - Used by: InventoryTable (inline stock editor)

- PUT /api/admin/products/bulk-update
  - Bulk stock update (creates BULK_ADJUSTMENT movements)
  - Used by: InventoryTable (bulk operation)

- GET /api/admin/products/:id/movements
  - Paginated inventory movements
  - Used by: ProductMovementsList

- GET /api/admin/products/:id/batches
  - Paginated normalized batches for the product
  - Used by: ProductBatchesList

- POST /api/admin/products/:id/adjustments
  - Create an IN/OUT/ADJUSTMENT movement; if IN with batchNumber, auto-creates batch if missing
  - Used by: ProductAdjustStockForm

- POST /api/admin/products/:id/refresh-images
  - Refresh expiring signed image URLs
  - Used by: ProductImageManager

## UI Wiring

- InventoryTable
  - Fetches products and displays stock & status.
  - Links:
    - View → /app/admin/products/:id
    - Edit → /app/admin/products/:id/edit
    - Movements → /app/admin/products/:id/movements
    - Adjust → /app/admin/products/:id/movements#adjust (deep-link to Adjust Stock form)

- Product Movements Page (/app/admin/products/:id/movements)
  - Renders:
    - ProductAdjustStockForm (id="adjust" anchor)
    - ProductMovementsList (filters, CSV export)
    - ProductBatchesList (search, CSV export)
  - Emits window event `inventory:updated` after adjustments; lists listen and refetch.

## Inventory Semantics

- All stock changes produce an inventory movement row with previous/new stock for auditability.
- Adjustments:
  - IN adds to stock; OUT subtracts (will throw if insufficient stock);
  - ADJUSTMENT uses signed delta derived from target stock in PUT /stock.
- Batches:
  - If hasExpiry, order fulfillment uses FEFO (earliest expiry first) allocation when creating OUT movements.

## Idempotency & Safety

- Adjustments accept `idempotencyKey`.
  - The service stores `notes: IDEMP:<key>` for traceability.
  - The web UI generates a default `ui-<timestamp>` key if user leaves it blank.
- Payments Rollback
  - On payment REFUNDED/CANCELLED, the system reverses prior OUT movements by creating compensating IN movements with notes `REVERSAL_OF:<movementId>`.

## Observability

- Structured logs on admin adjustments:
  - admin.products.adjustments.request (productId, type, qty, batchId, batchNumber, idempotencyKey, userId, reference*)
  - admin.products.adjustments.success (productId, movementId, newStock, batchId)
  - admin.products.adjustments.error (message, code, details)
- Inventory service also logs createAdjustment, fulfillOrder, and rollback flows.

## Security

- All admin endpoints are protected by auth + role=admin middleware.
- Zod DTOs validate and coerce payloads.

## Release Notes

See CHANGELOG.md for a summarized list of changes.
