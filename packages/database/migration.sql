-- AlterEnum
BEGIN;
CREATE TYPE "CustomerType_new" AS ENUM ('RETAIL', 'WHOLESALE', 'PHARMACY', 'CLINIC');
ALTER TABLE "customer" ALTER COLUMN "customerType" TYPE "CustomerType_new" USING ("customerType"::text::"CustomerType_new");
ALTER TYPE "CustomerType" RENAME TO "CustomerType_old";
ALTER TYPE "CustomerType_new" RENAME TO "CustomerType";
DROP TYPE "CustomerType_old";
COMMIT;

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_CONFIRMATION';

