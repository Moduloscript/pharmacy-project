-- Drop view to release dependencies
DROP VIEW IF EXISTS failed_payments_analysis;

-- Original Migration SQL (from migration.sql)
-- AlterEnum
BEGIN;
CREATE TYPE "CustomerType_new" AS ENUM ('RETAIL', 'WHOLESALE', 'PHARMACY', 'CLINIC');
ALTER TABLE "customer" ALTER COLUMN "customerType" TYPE "CustomerType_new" USING ("customerType"::text::"CustomerType_new");
ALTER TYPE "CustomerType" RENAME TO "CustomerType_old";
ALTER TYPE "CustomerType_new" RENAME TO "CustomerType";
DROP TYPE "CustomerType_old";
COMMIT;

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYMENT_CONFIRMATION';

-- Recreate View
CREATE VIEW failed_payments_analysis AS
SELECT p.id AS payment_id,
    p.method,
    p.amount,
    p."failureReason",
    p."retryCount",
    p."createdAt",
    p."updatedAt",
    EXTRACT(epoch FROM p."updatedAt" - p."createdAt") / 60::numeric AS failure_time_minutes,
    c."customerType",
    u.email AS customer_email,
    prl.retry_attempt,
    prl.retry_scheduled_at,
    prl.retry_result,
        CASE
            WHEN p."retryCount" = 0 THEN 'NO_RETRY_ATTEMPTED'::text
            WHEN (EXISTS ( SELECT 1
               FROM payment_retry_log prl2
              WHERE prl2.payment_id = p.id AND prl2.retry_result = 'pending'::text)) THEN 'RETRY_SCHEDULED'::text
            WHEN p."retryCount" > 0 THEN 'RETRY_EXHAUSTED'::text
            ELSE 'UNKNOWN'::text
        END AS retry_status
   FROM payment p
     LEFT JOIN customer c ON p."customerId" = c.id
     LEFT JOIN "user" u ON c."userId" = u.id
     LEFT JOIN payment_retry_log prl ON p.id = prl.payment_id AND prl.retry_attempt = (( SELECT max(prl2.retry_attempt) AS max
           FROM payment_retry_log prl2
          WHERE prl2.payment_id = p.id))
  WHERE p.status = 'FAILED'::"PaymentStatus" AND p."createdAt" >= (CURRENT_DATE - '30 days'::interval)
  ORDER BY p."createdAt" DESC;
