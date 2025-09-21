import { z } from "zod";
import { CreateProductBatchSchema } from "@repo/database";

// DTO representing a Product Batch record in API responses
export const ProductBatchDTO = z.object({
  id: z.string(),
  productId: z.string(),
  batchNumber: z.string(),
  qty: z.number().int(),
  costPrice: z.number().nonnegative().optional().nullable(),
  expiryDate: z.string().datetime({ offset: true }).optional().nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});
export type ProductBatch = z.infer<typeof ProductBatchDTO>;

// Request schema (reuse shared schema)
export const CreateProductBatchDTO = CreateProductBatchSchema;
export type CreateProductBatchInput = z.infer<typeof CreateProductBatchDTO>;

// Response schema for creating a batch
export const CreateProductBatchResponseDTO = ProductBatchDTO;
export type CreateProductBatchResponse = ProductBatch;
