import { db } from "@repo/database";
import { Prisma } from "@prisma/client";
import { logger } from "@repo/logs";

export type ListParams = {
  page: number;
  pageSize: number;
};

export type ListBatchesParams = ListParams & {
  expiryBefore?: Date;
  expiryAfter?: Date;
  search?: string;
};

export type ListMovementsParams = ListParams & {
  type?: ("IN" | "OUT" | "ADJUSTMENT")[];
  dateFrom?: Date;
  dateTo?: Date;
  createdBy?: string;
};

export const inventoryService = {
  async listBatches(productId: string, params: ListBatchesParams) {
    const { page, pageSize, expiryAfter, expiryBefore, search } = params;
    const where: any = { productId };
    if (expiryAfter || expiryBefore) {
      where.expiryDate = {} as any;
      if (expiryAfter) where.expiryDate.gte = expiryAfter;
      if (expiryBefore) where.expiryDate.lte = expiryBefore;
    }
    if (search) {
      where.batchNumber = { contains: search, mode: "insensitive" };
    }

    logger.debug("inventory.listBatches", { productId, page, pageSize, expiryAfter, expiryBefore, search });
    const [total, data] = await db.$transaction([
      db.productBatch.count({ where }),
      db.productBatch.findMany({
        where,
        orderBy: [{ expiryDate: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          productId: true,
          batchNumber: true,
          qty: true,
          costPrice: true,
          expiryDate: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return {
      data: data.map((b) => ({
        id: b.id,
        productId: b.productId,
        batchNumber: b.batchNumber,
        qty: b.qty,
        costPrice: b.costPrice ? Number(b.costPrice as unknown as Prisma.Decimal) : undefined,
        expiryDate: b.expiryDate ? b.expiryDate.toISOString() : null,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
      })),
      meta: { page, pageSize, total },
    };
  },

  async createBatch(productId: string, input: {
    batchNumber: string;
    qty?: number;
    costPrice?: number;
    expiryDate?: Date;
  }) {
    // Ensure product exists (soft check via FK would fail anyway)
    const created = await db.productBatch.create({
      data: {
        productId,
        batchNumber: input.batchNumber,
        qty: input.qty ?? 0,
        costPrice: input.costPrice !== undefined ? new Prisma.Decimal(input.costPrice) : undefined,
        expiryDate: input.expiryDate,
      },
      select: {
        id: true,
        productId: true,
        batchNumber: true,
        qty: true,
        costPrice: true,
        expiryDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      id: created.id,
      productId: created.productId,
      batchNumber: created.batchNumber,
      qty: created.qty,
      costPrice: created.costPrice ? Number(created.costPrice as unknown as Prisma.Decimal) : undefined,
      expiryDate: created.expiryDate ? created.expiryDate.toISOString() : null,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  },

  async listMovements(productId: string, params: ListMovementsParams) {
    const { page, pageSize, type, dateFrom, dateTo, createdBy } = params;
    const where: any = { productId };
    if (type && type.length > 0) where.type = { in: type };
    if (dateFrom || dateTo) {
      where.createdAt = {} as any;
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }
    if (createdBy) where.userId = createdBy;

    logger.debug("inventory.listMovements", { productId, page, pageSize, type, dateFrom, dateTo, createdBy });
    const [total, rows] = await db.$transaction([
      db.inventoryMovement.count({ where }),
      db.inventoryMovement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          productId: true,
          type: true,
          quantity: true,
          reason: true,
          reference: true,
          previousStock: true,
          newStock: true,
          batchNumber: true,
          expiryDate: true,
          batchId: true,
          userId: true,
          notes: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      data: rows.map((m) => ({
        id: m.id,
        productId: m.productId,
        type: m.type as any,
        quantity: m.quantity,
        reason: m.reason ?? null,
        reference: m.reference ?? null,
        previousStock: m.previousStock,
        newStock: m.newStock,
        batchNumber: m.batchNumber ?? null,
        expiryDate: m.expiryDate ? m.expiryDate.toISOString() : null,
        batchId: m.batchId ?? null,
        userId: m.userId ?? null,
        notes: m.notes ?? null,
        createdAt: m.createdAt.toISOString(),
      })),
      meta: { page, pageSize, total },
    };
  },

  async createAdjustment(productId: string, input: {
    type: "IN" | "OUT" | "ADJUSTMENT";
    qty: number;
    reason?: string;
    batchId?: string;
    batchNumber?: string;
    idempotencyKey?: string;
    createdBy?: string;
    referenceId?: string;
    referenceType?: string;
  }) {
    logger.info("inventory.createAdjustment.request", { productId, type: input.type, qty: input.qty, batchId: input.batchId, batchNumber: input.batchNumber, idempotencyKey: input.idempotencyKey });
    return await db.$transaction(async (tx) => {
      // Fetch current product
      const product = await tx.product.findUnique({ where: { id: productId }, select: { id: true, stockQuantity: true } });
      if (!product) throw new Error("Product not found");

      // Resolve/ensure batch if provided
      let resolvedBatchId: string | undefined = input.batchId;
      if (!resolvedBatchId && input.batchNumber) {
        const found = await tx.productBatch.findFirst({
          where: { productId, batchNumber: input.batchNumber },
          select: { id: true },
        });
        if (found) resolvedBatchId = found.id;
        else if (input.type === "IN") {
          const created = await tx.productBatch.create({
            data: { productId, batchNumber: input.batchNumber, qty: 0 },
            select: { id: true },
          });
          resolvedBatchId = created.id;
        }
      }

      // Determine delta
      const delta = input.type === "OUT" ? -input.qty : input.qty;
      const newStock = product.stockQuantity + delta;
      if (newStock < 0) throw new Error("Insufficient stock for this operation");

      // Update product stock
      const updatedProduct = await tx.product.update({ where: { id: productId }, data: { stockQuantity: newStock } });

      // Update batch stock if applicable
      if (resolvedBatchId) {
        const updatedBatch = await tx.productBatch.update({
          where: { id: resolvedBatchId },
          data: { qty: { increment: delta } },
          select: { qty: true },
        });
        // Some test environments may not fully mock the update return shape. Be defensive.
        if (updatedBatch && typeof (updatedBatch as any).qty === 'number' && (updatedBatch as any).qty < 0) {
          // Negative batch quantity is not allowed; abort transaction
          throw new Error("Insufficient batch quantity");
        }
      }

      // Create movement record
      const movement = await tx.inventoryMovement.create({
        data: {
          productId,
          type: input.type,
          quantity: delta,
          reason: input.reason ?? null,
          reference: input.referenceId ?? null,
          previousStock: product.stockQuantity,
          newStock: updatedProduct.stockQuantity,
          batchNumber: undefined, // maintained but superseded by batchId
          batchId: resolvedBatchId ?? null,
          userId: input.createdBy ?? null,
          notes: input.idempotencyKey ? `IDEMP:${input.idempotencyKey}` : null,
        },
        select: {
          id: true,
          productId: true,
          type: true,
          quantity: true,
          reason: true,
          reference: true,
          previousStock: true,
          newStock: true,
          batchNumber: true,
          expiryDate: true,
          batchId: true,
          userId: true,
          notes: true,
          createdAt: true,
        },
      });

      const result = {
        id: movement.id,
        productId: movement.productId,
        type: movement.type as any,
        quantity: movement.quantity,
        reason: movement.reason ?? null,
        reference: movement.reference ?? null,
        previousStock: movement.previousStock,
        newStock: movement.newStock,
        batchNumber: movement.batchNumber ?? null,
        expiryDate: movement.expiryDate ? movement.expiryDate.toISOString() : null,
        batchId: movement.batchId ?? null,
        userId: movement.userId ?? null,
        notes: movement.notes ?? null,
        createdAt: movement.createdAt.toISOString(),
      };
      logger.info("inventory.createAdjustment.success", { productId, type: result.type, qty: result.quantity, batchId: result.batchId, reference: input.referenceId });
      return result;
    });
  },

  /**
   * Create OUT movements for all items in an order using FEFO (earliest expiry first) allocation.
   * Idempotent by checking existing movements with reference = orderId.
   */
  async createOutMovementsForOrder(orderId: string) {
    logger.info("inventory.fulfillOrder.start", { orderId });
    // Idempotency: if movements already exist for this order reference, skip
    const existingCount = await db.inventoryMovement.count({ where: { reference: orderId } });
    if (existingCount > 0) {
      logger.info("inventory.fulfillOrder.skipped", { orderId, reason: "existing movements" });
      return { success: true, skipped: true } as const;
    }

    return await db.$transaction(async (tx) => {
      // Load order with items
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { orderItems: true },
      });
      if (!order) throw new Error("Order not found");

      for (const item of order.orderItems) {
        logger.debug("inventory.fulfillOrder.item", { orderId, productId: item.productId, quantity: item.quantity });
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { id: true, stockQuantity: true, hasExpiry: true },
        });
        if (!product) throw new Error("Product not found");

        const required = item.quantity;
        if (product.stockQuantity < required) {
          throw new Error(`Insufficient stock for product ${item.productId}`);
        }

        let prev = product.stockQuantity;
        let remaining = required;

        if (product.hasExpiry) {
          const batches = await tx.productBatch.findMany({
            where: { productId: product.id, qty: { gt: 0 } },
            orderBy: [
              { expiryDate: "asc" },
              { createdAt: "asc" },
            ],
            select: { id: true, qty: true },
          });

          for (const b of batches) {
            if (remaining <= 0) break;
            const take = Math.min(b.qty, remaining);
            if (take <= 0) continue;

            // decrement batch qty
            await tx.productBatch.update({ where: { id: b.id }, data: { qty: b.qty - take } });
            logger.debug("inventory.fulfillOrder.allocate", { orderId, productId: product.id, batchId: b.id, take, remaining: remaining - take });

            // create movement piece
            await tx.inventoryMovement.create({
              data: {
                productId: product.id,
                type: "OUT",
                quantity: -take,
                reason: "ORDER_FULFILLMENT",
                reference: orderId,
                previousStock: prev,
                newStock: prev - take,
                batchId: b.id,
                userId: null,
                notes: `ORDER:${order.orderNumber}`,
              },
            });

            prev -= take;
            remaining -= take;
          }
        }

        // If still remaining (no/insufficient batches), create a non-batch movement
        if (remaining > 0) {
          await tx.inventoryMovement.create({
            data: {
              productId: product.id,
              type: "OUT",
              quantity: -remaining,
              reason: "ORDER_FULFILLMENT",
              reference: orderId,
              previousStock: prev,
              newStock: prev - remaining,
              batchId: null,
              userId: null,
              notes: `ORDER:${order.orderNumber}`,
            },
          });
          prev -= remaining;
          remaining = 0;
        }

        // Update product stock once to final prev
        await tx.product.update({ where: { id: product.id }, data: { stockQuantity: prev } });
      }

      return { success: true, orderId } as const;
    });
  },

  /**
   * Roll back OUT movements for an order (e.g., refund/cancellation) by creating compensating IN movements.
   * - Increments product and batch quantities accordingly
   * - Adds IN movements with reason ORDER_REFUND or ORDER_CANCELLATION
   * - Idempotent: skips if reversal movements already exist; also guards per movement via notes
   */
  async rollbackOutMovementsForOrder(orderId: string, reason: "REFUND" | "CANCELLED") {
    logger.info("inventory.rollback.start", { orderId, reason });

    // Quick idempotency check: if any reversal already recorded, skip entirely
    const existingReverse = await db.inventoryMovement.count({
      where: {
        reference: orderId,
        type: "IN",
        reason: { in: ["ORDER_REFUND", "ORDER_CANCELLATION"] },
      },
    });
    if (existingReverse > 0) {
      logger.info("inventory.rollback.skipped", { orderId, reason, cause: "existing reversal" });
      return { success: true, skipped: true } as const;
    }

    return await db.$transaction(async (tx) => {
      // Load original OUT movements for this order
      const outs = await tx.inventoryMovement.findMany({
        where: { reference: orderId, type: "OUT", reason: "ORDER_FULFILLMENT" },
        orderBy: { createdAt: "asc" },
        select: { id: true, productId: true, quantity: true, batchId: true },
      });

      if (outs.length === 0) {
        logger.info("inventory.rollback.nothing_to_reverse", { orderId });
        return { success: true, skipped: true } as const;
      }

      // Group by product for efficient stock updates
      const byProduct = new Map<string, { id: string; productId: string; quantity: number; batchId: string | null }[]>();
      for (const m of outs) {
        const arr = byProduct.get(m.productId) ?? [];
        arr.push({ id: m.id, productId: m.productId, quantity: m.quantity, batchId: m.batchId ?? null });
        byProduct.set(m.productId, arr);
      }

      const reversalReason = reason === "REFUND" ? "ORDER_REFUND" : "ORDER_CANCELLATION";
      let reversedCount = 0;

      for (const [productId, moves] of byProduct.entries()) {
        const product = await tx.product.findUnique({ where: { id: productId }, select: { stockQuantity: true } });
        if (!product) continue; // product deleted? skip
        let prev = product.stockQuantity;

        for (const m of moves) {
          // Guard per movement: if specific reversal already exists, skip this one
          const already = await tx.inventoryMovement.count({
            where: { reference: orderId, type: "IN", notes: { contains: `REVERSAL_OF:${m.id}` } },
          });
          if (already > 0) {
            logger.debug("inventory.rollback.already_reversed", { orderId, movementId: m.id });
            continue;
          }

          const qty = -m.quantity; // m.quantity is negative; invert to positive

          // Update batch qty if applicable
          if (m.batchId) {
            await tx.productBatch.update({ where: { id: m.batchId }, data: { qty: { increment: qty } } });
          }

          // Update product stock stepwise to preserve accurate prev/new in movement log
          const newStock = prev + qty;
          await tx.product.update({ where: { id: productId }, data: { stockQuantity: newStock } });

          // Create compensating IN movement
          await tx.inventoryMovement.create({
            data: {
              productId,
              type: "IN",
              quantity: qty,
              reason: reversalReason,
              reference: orderId,
              previousStock: prev,
              newStock,
              batchId: m.batchId,
              userId: null,
              notes: `REVERSAL_OF:${m.id}`,
            },
          });

          prev = newStock;
          reversedCount += 1;
        }
      }

      logger.info("inventory.rollback.complete", { orderId, reason, reversedCount });
      return { success: true, reversedCount } as const;
    });
  },
};
