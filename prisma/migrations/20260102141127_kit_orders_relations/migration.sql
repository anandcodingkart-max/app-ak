-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_KitTags" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tagName" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "KitTags_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "KitCategories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_KitTags" ("categoryId", "createdAt", "id", "status", "tagName", "updatedAt") SELECT "categoryId", "createdAt", "id", "status", "tagName", "updatedAt" FROM "KitTags";
DROP TABLE "KitTags";
ALTER TABLE "new_KitTags" RENAME TO "KitTags";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
