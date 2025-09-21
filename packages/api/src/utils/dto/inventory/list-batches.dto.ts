import { z } from "zod";
import { ListBatchesQuerySchema } from "@repo/database";
import { PaginationMetaSchema } from "../pagination";
import { ProductBatchDTO } from "./create-batch.dto";

export const ListBatchesQueryDTO = ListBatchesQuerySchema;
export type ListBatchesQuery = z.infer<typeof ListBatchesQueryDTO>;

export const ListBatchesResponseDTO = z.object({
  data: z.array(ProductBatchDTO),
  meta: PaginationMetaSchema,
});
export type ListBatchesResponse = z.infer<typeof ListBatchesResponseDTO>;
