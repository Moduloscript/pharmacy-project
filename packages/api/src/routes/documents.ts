import { Hono } from "hono";
import { z } from "zod";
import { describeRoute } from "hono-openapi";
import { resolver, validator } from "hono-openapi/zod";
import { authMiddleware } from "../middleware/auth";
import { db } from "@repo/database";
import { getSignedUrl, deleteObject } from "@repo/storage";
import { config } from "@repo/config";
import { HTTPException } from "hono/http-exception";

export const documentsRouter = new Hono().basePath("/documents");

// Create document record after successful client-side upload
// POST /api/documents
const createSchema = z.object({
  name: z.string().min(1),
  key: z.string().min(1),
  mimeType: z.string().min(1).optional(),
  size: z.number().int().positive(),
  bucket: z.string().min(1).optional(),
  organizationId: z.string().optional(),
});

documentsRouter.post(
  "/",
  authMiddleware,
  validator("json", createSchema),
  describeRoute({
    tags: ["Documents"],
    summary: "Create a document record",
    responses: {
      201: {
        description: "Created document record",
        content: {
          "application/json": {
            schema: resolver(
              z.object({
                document: z.object({
                  id: z.string(),
                  name: z.string(),
                  key: z.string(),
                  mimeType: z.string().nullable(),
                  size: z.number().int(),
                  bucket: z.string(),
                  userId: z.string().nullable(),
                  organizationId: z.string().nullable(),
                  createdAt: z.string(),
                }),
              }),
            ),
          },
        },
      },
    },
  }),
  async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json");

    const bucket = body.bucket ?? config.storage.bucketNames.documents;

    const doc = await db.document.create({
      data: {
        name: body.name,
        key: body.key,
        mimeType: body.mimeType ?? null,
        size: body.size,
        bucket,
        userId: user?.id ?? null,
        organizationId: body.organizationId ?? null,
        createdAt: new Date(),
      },
    });

    return c.json({ document: {
      id: doc.id,
      name: doc.name,
      key: doc.key,
      mimeType: doc.mimeType,
      size: doc.size,
      bucket: doc.bucket,
      userId: doc.userId,
      organizationId: doc.organizationId,
      createdAt: doc.createdAt.toISOString(),
    } }, 201);
  },
);

// GET /api/documents/:id -> fetch metadata + signed URL
const idParam = z.object({ id: z.string().min(1) });

documentsRouter.get(
  "/:id",
  authMiddleware,
  validator("param", idParam),
  describeRoute({
    tags: ["Documents"],
    summary: "Get a document download URL",
    responses: {
      200: {
        description: "Signed URL and metadata",
        content: {
          "application/json": {
            schema: resolver(
              z.object({
                document: z.object({
                  id: z.string(),
                  name: z.string(),
                  key: z.string(),
                  mimeType: z.string().nullable(),
                  size: z.number().int(),
                  bucket: z.string(),
                }),
                signedUrl: z.string(),
              }),
            ),
          },
        },
      },
      404: { description: "Not found" },
    },
  }),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");

    const doc = await db.document.findUnique({ where: { id } });
    if (!doc) throw new HTTPException(404, { message: "Document not found" });

    const isOwner = !!(doc.userId && user?.id === doc.userId);
    const isAdmin = user?.role === "admin";
    if (!isOwner && !isAdmin) throw new HTTPException(403);

    const url = await getSignedUrl(doc.key, {
      bucket: doc.bucket,
      expiresIn: 60 * 60, // 1 hour
    });

    return c.json({
      document: {
        id: doc.id,
        name: doc.name,
        key: doc.key,
        mimeType: doc.mimeType,
        size: doc.size,
        bucket: doc.bucket,
      },
      signedUrl: url,
    });
  },
);

// DELETE /api/documents/:id -> delete storage object and DB record

documentsRouter.delete(
  "/:id",
  authMiddleware,
  validator("param", idParam),
  describeRoute({
    tags: ["Documents"],
    summary: "Delete a document",
    responses: {
      200: { description: "Deleted" },
      404: { description: "Not found" },
    },
  }),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");

    const doc = await db.document.findUnique({ where: { id } });
    if (!doc) throw new HTTPException(404, { message: "Document not found" });

    const isOwner = !!(doc.userId && user?.id === doc.userId);
    const isAdmin = user?.role === "admin";
    if (!isOwner && !isAdmin) throw new HTTPException(403);

    await deleteObject(doc.key, { bucket: doc.bucket }).catch(() => {
      // If storage deletion fails, we can choose to proceed or abort.
      // Here we proceed to delete DB to avoid dangling records.
    });

    await db.document.delete({ where: { id } });
    return c.json({ message: "Deleted" });
  },
);

