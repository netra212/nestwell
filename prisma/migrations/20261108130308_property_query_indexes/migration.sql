-- CreateIndex
CREATE INDEX "Property_listingType_createdAt_id_idx" ON "Property"("listingType", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Property_listingType_price_id_idx" ON "Property"("listingType", "price", "id");

-- CreateIndex
CREATE INDEX "Property_features_idx" ON "Property" USING GIN ("features");
