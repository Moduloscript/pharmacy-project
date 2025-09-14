import { auth } from "@repo/auth";
import { getBaseUrl } from "@repo/utils";
import { apiReference } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { openAPISpecs } from "hono-openapi";
import {} from "openapi-merge";
import {} from "openapi-merge";
import { mergeOpenApiSchemas } from "./lib/openapi-schema";
import { corsMiddleware } from "./middleware/cors";
import { loggerMiddleware } from "./middleware/logger";
import { adminRouter } from "./routes/admin/router";
import { aiRouter } from "./routes/ai";
import { authRouter } from "./routes/auth";
import { contactRouter } from "./routes/contact/router";
import { healthRouter } from "./routes/health";
import { newsletterRouter } from "./routes/newsletter";
import { organizationsRouter } from "./routes/organizations/router";
import { paymentsRouter } from "./routes/payments/router";
import { uploadsRouter } from "./routes/uploads";
import { webhooksRouter } from "./routes/webhooks";
import { productsRouter } from "./routes/products";
import { categoriesRouter } from "./routes/categories";
import { customersRouter } from "./routes/customers";
// Previously commented out due to missing dependency
import { cartRouter } from "./routes/cart";
import { ordersRouter } from "./routes/orders";
import { documentsRouter } from "./routes/documents";
import { notificationsEnhancedRouter } from "./routes/notifications-enhanced";
import { notificationsRouter } from "./routes/notifications";
import { notificationPreferencesRouter } from "./routes/notification-preferences";
import prescriptionsRouter from "./routes/prescriptions";

import type { AppBindings } from "./types/context";

export const app = new Hono<AppBindings>().basePath("/api");

app.use(loggerMiddleware);
app.use(corsMiddleware);

// Debug middleware to log all requests
app.use('*', async (c, next) => {
	console.log(`[DEBUG] ${c.req.method} ${c.req.url} - Path: ${c.req.path}`);
	await next();
});

const appRouter = app
	.route("/", authRouter)
	.route("/", webhooksRouter)
	.route("/", aiRouter)
	.route("/", uploadsRouter)
	.route("/", paymentsRouter)
	.route("/", contactRouter)
	.route("/", newsletterRouter)
	.route("/", organizationsRouter)
	.route("/", adminRouter)
	.route("/", healthRouter)
	.route("/products", productsRouter)
	.route("/categories", categoriesRouter)
	.route("/customers", customersRouter)
	.route("/", documentsRouter)
	// Uncommented now that dependencies are fixed
	.route("/cart", cartRouter)
	.route("/orders", ordersRouter)
	.route("/prescriptions", prescriptionsRouter)
	.route("/notifications", notificationsEnhancedRouter)
	.route("/notifications", notificationPreferencesRouter)
	.route("/notifications", notificationsRouter);

app.get(
	"/app-openapi",
	openAPISpecs(app, {
		documentation: {
			info: {
				title: "supastarter API",
				version: "1.0.0",
			},
			servers: [
				{
					url: getBaseUrl(),
					description: "API server",
				},
			],
		},
	}),
);

app.get("/openapi", async (c) => {
	const authSchema = await auth.api.generateOpenAPISchema();
	const appSchema = await (
		app.request("/api/app-openapi") as Promise<Response>
	).then((res) => res.json());

	const mergedSchema = mergeOpenApiSchemas({
		appSchema,
		authSchema: authSchema as any,
	});

	return c.json(mergedSchema);
});

app.get(
	"/docs",
	apiReference({
		theme: "saturn",
		spec: {
			url: "/api/openapi",
		},
	}),
);

// Catch-all route for debugging unmatched requests
app.all('*', (c) => {
	console.log(`[404] Unmatched route: ${c.req.method} ${c.req.url} - Path: ${c.req.path}`);
	return c.json({ error: 'Route not found', path: c.req.path, method: c.req.method }, 404);
});

export type AppRouter = typeof appRouter;
