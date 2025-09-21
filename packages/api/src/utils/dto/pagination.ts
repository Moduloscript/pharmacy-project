import { z } from "zod";

export const PaginationMetaSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  total: z.number().int().min(0),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

export const createPaginatedResponseSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    data: z.array(item),
    meta: PaginationMetaSchema,
  });

export type PaginatedResponse<T> = {
  data: T[];
  meta: PaginationMeta;
};
