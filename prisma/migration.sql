-- Add credit repayment tracking fields to PaymentSchedule table
ALTER TABLE "PaymentSchedule" 
ADD COLUMN "creditRepaymentAmount" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN "repaymentDate" TIMESTAMP(3);

-- Add credit repayment tracking fields to Transaction table
ALTER TABLE "Transaction" 
ADD COLUMN "creditRepaymentAmount" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN "lastRepaymentDate" TIMESTAMP(3);

-- Update existing records to have default values
UPDATE "PaymentSchedule" SET "creditRepaymentAmount" = 0 WHERE "creditRepaymentAmount" IS NULL;
UPDATE "Transaction" SET "creditRepaymentAmount" = 0 WHERE "creditRepaymentAmount" IS NULL;

-- Add bonusPercentage column to Product table
ALTER TABLE "Product" ADD COLUMN "bonusPercentage" DOUBLE PRECISION DEFAULT 0;
