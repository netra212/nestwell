-- AlterTable
ALTER TABLE "SearchQuery" ADD COLUMN     "cacheExpiresAt" TIMESTAMP(3),
ADD COLUMN     "cached" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "queryHash" TEXT;

-- CreateIndex
CREATE INDEX "SearchQuery_queryHash_cacheExpiresAt_idx" ON "SearchQuery"("queryHash", "cacheExpiresAt");
