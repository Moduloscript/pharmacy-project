import { Hono } from "hono";
import { db } from "@repo/database";
import type { AppBindings } from "../types/context";

export const promotionsRouter = new Hono<AppBindings>()
  .get("/", async (c) => {
    try {
      // using explicit casting for the raw query result
      const promotions = await db.$queryRaw`
        SELECT 
          id, 
          title, 
          description, 
          code, 
          color_scheme as "colorScheme", 
          image_url as "imageUrl", 
          is_active as "isActive", 
          starts_at as "startsAt", 
          ends_at as "endsAt", 
          created_at as "createdAt"
        FROM marketing_promotions 
        WHERE is_active = true
      ` as any[];
      
      return c.json({
        success: true,
        data: promotions
      });
    } catch (error) {
      console.error("Error fetching promotions:", error);
      return c.json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch promotions"
        }
      }, 500);
    }
  });

export default promotionsRouter;
