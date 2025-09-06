import { webhookHandler as paymentsWebhookHandler, createEnhancedWebhookHandler } from "@repo/payments";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import crypto from "node:crypto";

const enhancedWebhookHandler = createEnhancedWebhookHandler();

function verifyMetaSignature(rawBody: string, signature: string | null, appSecret: string | undefined): boolean {
  if (!signature || !appSecret) return false;
  // signature format: "sha256=HEX"
  const [algo, sigHex] = signature.split("=");
  if (algo !== "sha256" || !sigHex) return false;
  const hmac = crypto.createHmac("sha256", appSecret);
  hmac.update(rawBody, "utf8");
  const expected = hmac.digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(sigHex, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export const webhooksRouter = new Hono()
  // Payments webhook (existing)
  .post(
    "/webhooks/payments",
    describeRoute({
      tags: ["Webhooks"],
      summary: "Handle payments webhook (supports both traditional and Nigerian payments)",
    }),
    (c) => {
      return enhancedWebhookHandler(c.req.raw);
    },
  )
  // TODO: WhatsApp webhook endpoints - DEFERRED TO PHASE 2
  // When WhatsApp integration is ready, uncomment the following:
  /*
  // WhatsApp webhook verification (GET)
  .get(
    "/webhooks/whatsapp",
    describeRoute({
      tags: ["Webhooks"],
      summary: "Verify WhatsApp webhook (hub.challenge)",
    }),
    (c) => {
      const url = new URL(c.req.url);
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");
      const expected = process.env.WHATSAPP_VERIFY_TOKEN;

      if (mode === "subscribe" && token && expected && token === expected && challenge) {
        return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
      }
      return c.json({ error: "Verification failed" }, 403);
    }
  )
  // WhatsApp webhook events (POST)
  .post(
    "/webhooks/whatsapp",
    describeRoute({
      tags: ["Webhooks"],
      summary: "Handle WhatsApp Cloud API webhooks",
    }),
    async (c) => {
      const appSecret = process.env.META_APP_SECRET;
      const sig = c.req.header("x-hub-signature-256") || c.req.header("X-Hub-Signature-256") || null;
      const raw = await c.req.text();

      // Optional signature verification
      if (appSecret) {
        const ok = verifyMetaSignature(raw, sig, appSecret);
        if (!ok) {
          console.warn("WhatsApp webhook signature verification failed");
          // You can choose to reject (403). For initial setup, accept but log.
          // return c.json({ error: "Invalid signature" }, 403);
        }
      }

      // Parse JSON and log minimal info; integrate with your queue/DB later
      try {
        const payload = JSON.parse(raw);
        console.log("[WhatsApp Webhook] event:", JSON.stringify(payload));
        // TODO: upsert delivery status, handle inbound messages, etc.
        return c.json({ received: true });
      } catch (err) {
        console.error("Invalid WhatsApp webhook payload", err);
        return c.json({ error: "Invalid JSON" }, 400);
      }
    }
  )
  */;
