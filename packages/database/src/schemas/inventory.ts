import { z } from "zod";

// Movement types used across inventory adjustments and order flows
export const MovementTypeSchema = z.enum(["IN", "OUT", "ADJUSTMENT"]);
export type MovementType = z.infer<typeof MovementTypeSchema>;

// Shared pagination helper for list endpoints
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// Create Product Batch payload
export const CreateProductBatchSchema = z.object({
  productId: z.string().min(1, "productId is required"),
  batchNumber: z.string().min(1, "batchNumber is required"),
  qty: z.coerce.number().int().min(0, "qty cannot be negative").default(0),
  costPrice: z
    .union([z.coerce.number().nonnegative(), z.literal("")])
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  expiryDate: z
    .union([z.string().datetime({ offset: true }), z.coerce.date()])
    .optional(),
});
export type CreateProductBatchInput = z.infer<typeof CreateProductBatchSchema>;

// Create Adjustment payload
export const CreateAdjustmentSchema = z.object({
  productId: z.string().min(1, "productId is required"),
  type: MovementTypeSchema,
  qty: z.coerce.number().int().positive("qty must be > 0"),
  reason: z.string().max(500).optional(),
  // Optionally link to a batch either by id or batchNumber
  batchId: z.string().min(1).optional(),
  batchNumber: z.string().min(1).optional(),
  // Idempotency to protect against retries
  idempotencyKey: z.string().max(100).optional(),
  // Traceability
  createdBy: z.string().optional(), // userId
  referenceId: z.string().optional(),
  referenceType: z.string().optional(),
});
export type CreateAdjustmentInput = z.infer<typeof CreateAdjustmentSchema>;

// List queries
export const ListBatchesQuerySchema = PaginationSchema.extend({
  expiryBefore: z.union([z.string().datetime({ offset: true }), z.coerce.date()]).optional(),
  expiryAfter: z.union([z.string().datetime({ offset: true }), z.coerce.date()]).optional(),
  search: z.string().optional(),
});
export type ListBatchesQuery = z.infer<typeof ListBatchesQuerySchema>;

export const ListMovementsQuerySchema = PaginationSchema.extend({
  type: z.array(MovementTypeSchema).optional(),
  dateFrom: z.union([z.string().datetime({ offset: true }), z.coerce.date()]).optional(),
  dateTo: z.union([z.string().datetime({ offset: true }), z.coerce.date()]).optional(),
  createdBy: z.string().optional(),
});
export type ListMovementsQuery = z.infer<typeof ListMovementsQuerySchema>;