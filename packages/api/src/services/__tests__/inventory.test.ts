import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inventoryService } from '../inventory';
import { db } from '@repo/database';

vi.mock('@repo/database', () => ({
  db: {
    $transaction: vi.fn(),
    productBatch: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    inventoryMovement: {
      count: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    order: {
      findUnique: vi.fn(),
    },
  },
}));

// Helper to simulate Prisma $transaction behavior for both array and callback usage
function setupTransactionMock() {
  vi.mocked(db.$transaction).mockImplementation(async (arg: any) => {
    if (Array.isArray(arg)) {
      // arg is an array of Promises (mocked Prisma calls already invoked)
      return Promise.all(arg);
    }
    if (typeof arg === 'function') {
      // pass the same mocked db as tx
      return arg(db as any);
    }
    return arg;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  setupTransactionMock();
});

describe('inventoryService.listBatches', () => {
  it('returns mapped batches with pagination meta', async () => {
    vi.mocked(db.productBatch.count).mockResolvedValue(2 as any);
    vi.mocked(db.productBatch.findMany).mockResolvedValue([
      {
        id: 'b1', productId: 'p1', batchNumber: 'BN-1', qty: 5,
        costPrice: null, expiryDate: new Date('2026-01-01'), createdAt: new Date('2025-01-01'), updatedAt: new Date('2025-01-02')
      },
      {
        id: 'b2', productId: 'p1', batchNumber: 'BN-2', qty: 3,
        costPrice: null, expiryDate: null, createdAt: new Date('2025-02-01'), updatedAt: new Date('2025-02-02')
      },
    ] as any);

    const res = await inventoryService.listBatches('p1', { page: 1, pageSize: 20 });
    expect(res.meta).toEqual({ page: 1, pageSize: 20, total: 2 });
    expect(res.data).toHaveLength(2);
    expect(res.data[0]).toMatchObject({ id: 'b1', batchNumber: 'BN-1', qty: 5, expiryDate: '2026-01-01T00:00:00.000Z' });
  });
});

describe('inventoryService.listMovements', () => {
  it('returns movement rows and meta', async () => {
    vi.mocked(db.inventoryMovement.count).mockResolvedValue(1 as any);
    vi.mocked(db.inventoryMovement.findMany).mockResolvedValue([
      {
        id: 'm1', productId: 'p1', type: 'ADJUSTMENT', quantity: -2, reason: 'fix', reference: null,
        previousStock: 10, newStock: 8, batchNumber: null, expiryDate: null, batchId: null, userId: null, notes: null, createdAt: new Date('2025-01-01T10:00:00Z')
      },
    ] as any);

    const res = await inventoryService.listMovements('p1', { page: 1, pageSize: 20 });
    expect(res.meta.total).toBe(1);
    expect(res.data[0]).toMatchObject({ id: 'm1', type: 'ADJUSTMENT', previousStock: 10, newStock: 8 });
  });
});

describe('inventoryService.createAdjustment', () => {
  it('creates IN adjustment and new batch when batchNumber provided and not existing', async () => {
    // product has 10 in stock
    vi.mocked(db.product.findUnique).mockResolvedValue({ id: 'p1', stockQuantity: 10 } as any);
    // no existing batch => create
    vi.mocked(db.productBatch.findFirst).mockResolvedValue(null as any);
    vi.mocked(db.productBatch.create).mockResolvedValue({ id: 'batch-new' } as any);
    // batch qty will be incremented atomically by +5 and return new qty
    vi.mocked(db.productBatch.update).mockResolvedValue({ qty: 5 } as any);
    // product.update to new stock
    vi.mocked(db.product.update).mockResolvedValue({ id: 'p1', stockQuantity: 15 } as any);
    // movement.create returns record
    vi.mocked(db.inventoryMovement.create).mockResolvedValue({
      id: 'mov1', productId: 'p1', type: 'IN', quantity: 5, previousStock: 10, newStock: 15,
      reason: null, reference: null, batchNumber: null, expiryDate: null, batchId: 'batch-new', userId: null, notes: null, createdAt: new Date('2025-01-01T00:00:00Z')
    } as any);

    const res = await inventoryService.createAdjustment('p1', { type: 'IN', qty: 5, batchNumber: 'BN-NEW' });
    expect(db.productBatch.create).toHaveBeenCalled();
    expect(db.productBatch.update).toHaveBeenCalledWith({ where: { id: 'batch-new' }, data: { qty: { increment: 5 } }, select: { qty: true } });
    expect(res).toMatchObject({ type: 'IN', quantity: 5, previousStock: 10, newStock: 15, batchId: 'batch-new' });
  });

  it('prevents OUT adjustment when insufficient stock', async () => {
    vi.mocked(db.product.findUnique).mockResolvedValue({ id: 'p1', stockQuantity: 2 } as any);
    await expect(inventoryService.createAdjustment('p1', { type: 'OUT', qty: 5 })).rejects.toThrow(/Insufficient stock/);
  });
});

describe('inventoryService.createOutMovementsForOrder', () => {
  it('allocates using FEFO and creates movements per batch, updates product stock', async () => {
    // No existing movements for this order
    vi.mocked(db.inventoryMovement.count).mockResolvedValue(0 as any);
    // Order with one line of qty 7
    vi.mocked(db.order.findUnique).mockResolvedValue({ id: 'ord1', orderNumber: 'O-001', orderItems: [{ id: 'oi1', productId: 'p1', quantity: 7 }] } as any);
    // Product has 10 and is batch-managed by expiry
    vi.mocked(db.product.findUnique).mockResolvedValue({ id: 'p1', stockQuantity: 10, hasExpiry: true } as any);
    // Batches: first expires earlier with qty 5, second with qty 4
    vi.mocked(db.productBatch.findMany).mockResolvedValue([
      { id: 'b1', qty: 5 },
      { id: 'b2', qty: 4 },
    ] as any);

    // Track updates and movement creations
    vi.mocked(db.productBatch.update).mockResolvedValue({} as any);
    const createdMovements: any[] = [];
    vi.mocked(db.inventoryMovement.create).mockImplementation(async ({ data }: any) => {
      createdMovements.push(data);
      return { id: 'mx', ...data, createdAt: new Date() } as any;
    });
    vi.mocked(db.product.update).mockResolvedValue({ id: 'p1', stockQuantity: 3 } as any);

    const result = await inventoryService.createOutMovementsForOrder('ord1');
    expect(result).toMatchObject({ success: true, orderId: 'ord1' });

    // Expect two movements: -5 from b1 then -2 from b2; prev/new reflects stepwise updates
    expect(createdMovements).toHaveLength(2);
    expect(createdMovements[0]).toMatchObject({ type: 'OUT', quantity: -5, batchId: 'b1', previousStock: 10, newStock: 5, reason: 'ORDER_FULFILLMENT', reference: 'ord1' });
    expect(createdMovements[1]).toMatchObject({ type: 'OUT', quantity: -2, batchId: 'b2', previousStock: 5, newStock: 3, reason: 'ORDER_FULFILLMENT', reference: 'ord1' });

    // Product stock updated once to final 3
    expect(db.product.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { stockQuantity: 3 } });
    // Batch qty decremented appropriately
    expect(db.productBatch.update).toHaveBeenCalledWith({ where: { id: 'b1' }, data: { qty: 0 } });
    expect(db.productBatch.update).toHaveBeenCalledWith({ where: { id: 'b2' }, data: { qty: 2 } });
  });
});