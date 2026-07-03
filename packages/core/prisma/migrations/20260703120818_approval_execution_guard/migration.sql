-- AlterTable
ALTER TABLE "Approval" ADD COLUMN     "executedAt" TIMESTAMP(3),
ADD COLUMN     "executionResult" JSONB;
