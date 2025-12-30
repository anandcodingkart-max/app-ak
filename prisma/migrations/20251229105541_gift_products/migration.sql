-- CreateTable
CREATE TABLE "GiftProducts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "recipientName" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "giftMessage" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "couponCode" TEXT NOT NULL,
    "expireDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
