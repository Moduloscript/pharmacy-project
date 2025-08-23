-- DRY-RUN: Detect and preview fixes for 100x amount mismatches between payment.amount and order.total
-- IMPORTANT: This script DOES NOT modify data. The UPDATE is provided commented out for review.
-- Run in Supabase SQL editor or via MCP execute_sql after review.

BEGIN;

-- 1) Preview mismatches and computed ratios
WITH mismatches AS (
  SELECT 
    p.id              AS payment_id,
    p."orderId"       AS order_id,
    p.amount::numeric AS payment_amount,
    o.total::numeric  AS order_amount,
    CASE 
      WHEN p.amount::numeric > 0 THEN (o.total::numeric / p.amount::numeric)
      ELSE NULL
    END               AS ratio,
    p.status          AS payment_status,
    o."paymentStatus" AS order_payment_status,
    p."createdAt"
  FROM payment p
  JOIN "order" o ON o.id = p."orderId"
  WHERE 
    o.total IS NOT NULL 
    AND p.amount IS NOT NULL
    AND ABS(o.total::numeric - p.amount::numeric) >= 1.0
)
SELECT *
FROM mismatches
ORDER BY "createdAt" DESC;

-- 2) Candidate rows that look like classic 100x mismatch
WITH candidates AS (
  SELECT 
    payment_id,
    order_id,
    payment_amount,
    order_amount,
    ratio
  FROM (
    SELECT 
      p.id              AS payment_id,
      p."orderId"       AS order_id,
      p.amount::numeric AS payment_amount,
      o.total::numeric  AS order_amount,
      CASE 
        WHEN p.amount::numeric > 0 THEN (o.total::numeric / p.amount::numeric)
        ELSE NULL
      END               AS ratio,
      p."createdAt"
    FROM payment p
    JOIN "order" o ON o.id = p."orderId"
  ) t
  WHERE ratio BETWEEN 99 AND 101 -- ~100x factor
)
SELECT * FROM candidates ORDER BY payment_id;

-- 3) Proposed fix (REVIEW BEFORE UNCOMMENTING)
-- This sets payment.amount := order.total for 100x ratio rows only
-- and appends a note to failureReason if present.
--
-- UPDATE payment p
-- SET 
--   amount = o.total,
--   "updatedAt" = NOW(),
--   "failureReason" = COALESCE(p."failureReason", '') || CASE WHEN p."failureReason" IS NULL OR p."failureReason" = '' THEN '' ELSE ' | ' END || 'auto-fix: amount set to match order.total'
-- FROM "order" o
-- WHERE 
--   p."orderId" = o.id
--   AND p.amount IS NOT NULL AND o.total IS NOT NULL
--   AND p.amount > 0
--   AND (o.total::numeric / p.amount::numeric) BETWEEN 99 AND 101;

ROLLBACK; -- keep as dry-run by default
