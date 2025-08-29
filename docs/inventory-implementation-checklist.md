# Inventory & Stock Management Implementation Plan

This document defines the **purpose**, **scope**, and **step-by-step checklist** for implementing all remaining inventory functions:

1. Real-time Stock Reservation during Checkout (Customer-facing)
2. Stock Level Updates after Order Fulfilment (Admin automation)
3. Low Stock Alert System (Admin notifications)
4. FIFO Allocation & Expiry Management (System automation)

Each section lists *database*, *API*, *frontend/UX*, *background jobs*, *notifications*, *testing*, and *success metrics* so every stakeholder understands what "done" means.

---

## Legend
- ☑︎ = Completed
- ☐ = Pending

Stakeholders:
- **Customer** = Retail & Wholesale buyers
- **Admin** = Pharmacy staff & managers
- **System** = Background workers / cron jobs

---

## Phase 1 – Real-time Stock Reservation (Customer)
| Area | Task | Status |
|------|------|--------|
| Database | Add `reservedQuantity` field to `Product` model | ☐ |
| Database | Create `StockReservation` table (`id`, `orderId?`, `productId`, `quantity`, `expiresAt`) | ☐ |
| API | `POST /api/cart/reserve` – create/refresh reservation tokens | ☐ |
| API | `DELETE /api/cart/reserve/:id` – release reservation | ☐ |
| Business Logic | Reserve stock for **15 min** when customer proceeds to checkout | ☐ |
| Business Logic | Auto-release expired reservations via cron (5 min) | ☐ |
| Frontend | Show "⏳ Reserved for 15 min" countdown in cart | ☐ |
| Concurrency | Prevent oversell with DB transaction / row-level lock | ☐ |
| Testing | Simulate 2 concurrent checkouts, ensure no oversell | ☐ |
| Metrics | Track `reservationSuccessRate`, `oversellIncidents` | ☐ |

---

## Phase 2 – Stock Level Updates after Fulfilment (Admin)
| Area | Task | Status |
|------|------|--------|
| API | Hook into `/api/orders/:id/status` → when status becomes `DISPATCHED` or `DELIVERED` | ☐ |
| Business Logic | `Product.stockQuantity -= orderItem.quantity` | ☐ |
| Business Logic | Release any active `StockReservation` rows | ☐ |
| Business Logic | Upsert `InventoryMovement` rows (type=`OUT`) | ☐ |
| Frontend | Admin dashboard badge "Stock updated" | ☐ |
| Testing | Unit test order → stock decrement | ☐ |
| Metrics | `stockAccuracyRate` (physical vs system count) | ☐ |

---

## Phase 3 – Low Stock Alert System (Admin)
| Area | Task | Status |
|------|------|--------|
| Database | Add `minStockLevel` (already exists) & `lowStockNotifiedAt` to `Product` | ☐ |
| Background Job | Cron job every hour → query `stockQuantity < minStockLevel` | ☐ |
| Notification | Send WhatsApp & SMS via `packages/mail` providers | ☐ |
| Notification | Insert row into `Notification` table (status=PENDING) | ☐ |
| Frontend | Admin dashboard "Low Stock" widget with filters | ☐ |
| Escalation | Repeat alert every 24h until resolved | ☐ |
| Testing | Mock Termii & WhatsApp, assert delivery & retry | ☐ |
| Metrics | `lowStockAlertDeliveryRate`, `stockoutIncidents` | ☐ |

---

## Phase 4 – FIFO Allocation & Expiry Management (System)
| Area | Task | Status |
|------|------|--------|
| Database | Add `batchNumber`, `expiryDate` columns to `InventoryMovement` (exists) | ☑︎ |
| Database | Create `InventoryBatch` table for per-batch quantities | ☐ |
| Business Logic | During reservation & fulfilment, select oldest (earliest expiry) batch first | ☐ |
| Business Logic | Prevent allocation of `expiryDate <= today` | ☐ |
| Background Job | Daily job → mark batches nearing expiry (90/30/7 days) | ☐ |
| Notification | Send low-expiry WhatsApp/SMS alerts to Admin | ☐ |
| Reporting | Add "Expiry & Waste" report to admin reports | ☐ |
| Testing | Unit test FIFO selector w/ three batches | ☐ |
| Metrics | `expiredWasteRate`, `fifoComplianceRate` | ☐ |

---

## Cross-Cutting Concerns
| Area | Task | Status |
|------|------|--------|
| Migrations | Generate Prisma migration files for all new tables/fields | ☐ |
| Security | Ensure all new endpoints use auth middleware | ☐ |
| Performance | Add DB indexes: `StockReservation.productId`, `InventoryBatch.expiryDate` | ☐ |
| Monitoring | Grafana / Prometheus alerts for stockouts & FIFO failures | ☐ |
| Documentation | Update API reference & ERD diagrams | ☐ |

---

## Acceptance Criteria
1. **Zero oversell incidents** during concurrent checkouts.
2. **<5 min alert** latency from low-stock detection to admin notification.
3. **100 % FIFO compliance** verified by automated tests.
4. **Inventory accuracy ≥ 98 %** between system and physical count.

---

*Document generated — 26 Aug 2025*

