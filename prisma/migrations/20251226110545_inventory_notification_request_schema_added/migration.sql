-- CreateTable
CREATE TABLE "InventoryNotificationRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "InventoryNotificationRequest_variantId_idx" ON "InventoryNotificationRequest"("variantId");

-- CreateIndex
CREATE INDEX "InventoryNotificationRequest_email_idx" ON "InventoryNotificationRequest"("email");
