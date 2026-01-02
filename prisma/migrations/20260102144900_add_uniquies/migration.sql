/*
  Warnings:

  - A unique constraint covering the columns `[customerId,productId,variantId]` on the table `kitOrderHistory` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "kitOrderHistory_customerId_productId_variantId_key" ON "kitOrderHistory"("customerId", "productId", "variantId");
