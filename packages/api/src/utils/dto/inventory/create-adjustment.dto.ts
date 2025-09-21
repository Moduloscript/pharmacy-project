import { z } from "zod";
import { CreateAdjustmentSchema, MovementTypeSchema } from "@repo/database";

// DTO representing an Inventory Movement in API responses
export const InventoryMovementDTO = z.object({
  id: z.string(),
  productId: z.string(),
  type: MovementTypeSchema,
  quantity: z.number().int(),
  reason: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  previousStock: z.number().int(),
  newStock: z.number().int(),
  batchNumber: z.string().optional().nullable(),
  expiryDate: z.string().datetime({ offset: true }).optional().nullable(),
  batchId: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  createdAt: z.string().datetime({ offset: true }),
});
export type InventoryMovement = z.infer<typeof InventoryMovementDTO>;

// Request schema (reuse shared schema)
export const CreateAdjustmentDTO = CreateAdjustmentSchema;
export type CreateAdjustmentInput = z.infer<typeof CreateAdjustmentDTO>;

// Response schema for creating an adjustment
export const CreateAdjustmentResponseDTO = InventoryMovementDTO;
export type CreateAdjustmentResponse = InventoryMovement;
