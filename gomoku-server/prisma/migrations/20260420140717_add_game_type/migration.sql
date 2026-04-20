-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "boardSize" INTEGER NOT NULL DEFAULT 15,
    "moves" TEXT NOT NULL,
    "result" TEXT,
    "playerBlack" TEXT,
    "playerWhite" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "gameType" TEXT NOT NULL DEFAULT 'gomoku',
    "tags" TEXT NOT NULL,
    "metadata" TEXT,
    "authorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Game_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Game" ("authorId", "boardSize", "createdAt", "description", "id", "isPublic", "metadata", "moves", "playerBlack", "playerWhite", "result", "tags", "title", "updatedAt") SELECT "authorId", "boardSize", "createdAt", "description", "id", "isPublic", "metadata", "moves", "playerBlack", "playerWhite", "result", "tags", "title", "updatedAt" FROM "Game";
DROP TABLE "Game";
ALTER TABLE "new_Game" RENAME TO "Game";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
