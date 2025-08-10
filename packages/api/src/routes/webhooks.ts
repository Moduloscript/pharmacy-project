import { webhookHandler as paymentsWebhookHandler, createEnhancedWebhookHandler } from "@repo/payments";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";

const enhancedWebhookHandler = createEnhancedWebhookHandler();

export const webhooksRouter = new Hono().post(
	"/webhooks/payments",
	describeRoute({
		tags: ["Webhooks"],
		summary: "Handle payments webhook (supports both traditional and Nigerian payments)",
	}),
	(c) => {
		return enhancedWebhookHandler(c.req.raw);
	},
);
