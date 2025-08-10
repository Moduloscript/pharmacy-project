import { auth } from "../auth";
import { headers } from "next/headers";
import { cache } from "react";

/**
 * Get the current session on the server side
 * This function is cached per request to avoid multiple database calls
 */
export const getSession = cache(async () => {
  return await auth.api.getSession({
    headers: await headers(),
  });
});

/**
 * Get the current user on the server side
 * This function is cached per request to avoid multiple database calls
 */
export const getUser = cache(async () => {
  const session = await getSession();
  return session?.user || null;
});

/**
 * Check if the current user is authenticated
 */
export const isAuthenticated = cache(async () => {
  const session = await getSession();
  return !!session?.user;
});

/**
 * Check if the current user has admin role
 */
export const isAdmin = cache(async () => {
  const user = await getUser();
  return user?.role === "admin";
});
