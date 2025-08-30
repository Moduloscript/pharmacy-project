import { config } from "@repo/config";
import { getSignedUploadUrl } from "@repo/storage";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { resolver, validator } from "hono-openapi/zod";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";

export const uploadsRouter = new Hono().basePath("/uploads").post(
	"/signed-upload-url",
	authMiddleware,
	validator(
		"query",
		z.object({
			bucket: z.string().min(1),
			path: z.string().min(1),
			contentType: z.string().min(1).optional(),
		}),
	),
	describeRoute({
		tags: ["Uploads"],
		summary: "Get a signed upload url",
		description: "Get a signed upload url for a given bucket and path",
		responses: {
			200: {
				description: "Returns a signed upload url",
				content: {
					"application/json": {
						schema: resolver(z.object({ signedUrl: z.string() })),
					},
				},
			},
			403: {
				description: "Not allowed",
			},
		},
	}),
	async (c) => {
		const { bucket, path, contentType } = c.req.valid("query");
		// ATTENTION: be careful with how you give access to write to the storage
		// always check if the user has the right to write to the desired bucket before giving them a signed url

	if (bucket === config.storage.bucketNames.avatars) {
		const signedUrl = await getSignedUploadUrl(path, { bucket, contentType });
		return c.json({ signedUrl });
	}

	// Allow product images bucket
	if (bucket === config.storage.bucketNames.productImages) {
		const signedUrl = await getSignedUploadUrl(path, { bucket, contentType });
		return c.json({ signedUrl });
	}

	// Allow documents bucket
	if (bucket === config.storage.bucketNames.documents) {
		const signedUrl = await getSignedUploadUrl(path, { bucket, contentType });
		return c.json({ signedUrl });
	}

	throw new HTTPException(403);
	},
);
