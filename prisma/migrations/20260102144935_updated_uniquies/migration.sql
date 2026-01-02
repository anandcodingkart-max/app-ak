/*
  Warnings:

  - A unique constraint covering the columns `[customerId,productId,variantId]` on the table `KitOrders` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "kitOrderHistory_customerId_productId_variantId_key";

-- CreateIndex
CREATE UNIQUE INDEX "KitOrders_customerId_productId_variantId_key" ON "KitOrders"("customerId", "productId", "variantId");
