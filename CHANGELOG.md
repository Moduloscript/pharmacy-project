# Changelog

## Unreleased

### Added
- Inventory rollback on payment REFUNDED/CANCELLED (creates compensating IN movements with `REVERSAL_OF:<movementId>`).
- Deep link to Adjust Stock form from Inventory table (`/movements#adjust`).
- Default `idempotencyKey` generation in Adjust form to reduce accidental duplicate submissions.
- CSV export buttons for Inventory Movements and Batches lists.
- Structured logging for admin product adjustments (request/success/error events).
- Documentation in `docs/INVENTORY.md` detailing inventory endpoints and UI wiring.

### Changed
- Inventory service: atomic batch quantity updates inside transactions to prevent transaction API errors.

### Fixed
- Resolved Prisma transaction error by switching to atomic increments for batch quantity updates.
