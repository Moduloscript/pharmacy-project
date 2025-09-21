export { PrismaClient, PrescriptionStatus, PrescriptionAuditAction } from "@prisma/client";
export * from "./src/client";
export { db } from "./src/client";
export * from "./src/zod/index";
export * from "./src/schemas/inventory";

declare global {
	namespace PrismaJson {
		type AIChatMessages = Array<{
			role: "user" | "assistant";
			content: string;
		}>;
	}
}
