import { auth } from "@repo/auth";
import { Hono } from "hono";

// Create auth router that forwards all requests to better-auth
export const authRouter = new Hono()
	// Handle all auth sub-paths with a more specific pattern
	.all("/auth/*", async (c) => {
		console.log(`[AUTH] Handling: ${c.req.method} ${c.req.url} - Path: ${c.req.path}`);
		try {
			const response = await auth.handler(c.req.raw);
			console.log(`[AUTH] Response status: ${response.status}`);
			return response;
		} catch (error) {
			console.error(`[AUTH] Error:`, error);
			throw error;
		}
	})
	// Also try with /** pattern
	.all("/auth/**", async (c) => {
		console.log(`[AUTH] Handling **: ${c.req.method} ${c.req.url} - Path: ${c.req.path}`);
		try {
			const response = await auth.handler(c.req.raw);
			console.log(`[AUTH] Response status: ${response.status}`);
			return response;
		} catch (error) {
			console.error(`[AUTH] Error:`, error);
			throw error;
		}
	});
