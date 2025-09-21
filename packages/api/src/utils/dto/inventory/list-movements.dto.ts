import { z } from "zod";
import { ListMovementsQuerySchema } from "@repo/database";
import { PaginationMetaSchema } from "../pagination";
import { InventoryMovementDTO } from "./create-adjustment.dto";

export const ListMovementsQueryDTO = ListMovementsQuerySchema;
export type ListMovementsQuery = z.infer<typeof ListMovementsQueryDTO>;

export const ListMovementsResponseDTO = z.object({
  data: z.array(InventoryMovementDTO),
  meta: PaginationMetaSchema,
});
export type ListMovementsResponse = z.infer<typeof ListMovementsResponseDTO>;
