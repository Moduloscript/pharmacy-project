import { auth } from "@repo/auth/auth";

// Export the auth handler for all methods
const handler = auth.handler;

export { handler as GET, handler as POST, handler as PUT, handler as DELETE, handler as PATCH };
