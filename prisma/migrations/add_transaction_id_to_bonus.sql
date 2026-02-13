-- Add transactionId field to Bonus table
ALTER TABLE "Bonus" ADD COLUMN "transactionId" INTEGER;

-- Create index for transactionId
CREATE INDEX "Bonus_transactionId_idx" ON "Bonus"("transactionId");

-- Add foreign key constraint
ALTER TABLE "Bonus" ADD CONSTRAINT "Bonus_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
