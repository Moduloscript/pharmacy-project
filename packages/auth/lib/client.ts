"use client";

import { authClient } from "../client";

// Re-export the hooks from the auth client
export const {
  useSession,
  signIn,
  signOut,
  signUp,
  useUser,
  $Infer
} = authClient;

// Export the full auth client for advanced usage
export { authClient };

// Helper hooks
export function useIsAuthenticated() {
  const { data: session } = useSession();
  return !!session?.user;
}

export function useIsAdmin() {
  const { data: session } = useSession();
  return session?.user?.role === "admin";
}
