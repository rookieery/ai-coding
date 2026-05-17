-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "gameType" TEXT NOT NULL DEFAULT 'gomoku',
    "boardSize" INTEGER NOT NULL DEFAULT 15,
    "ruleMode" TEXT NOT NULL DEFAULT 'standard',
    "maxSpectators" INTEGER NOT NULL DEFAULT 50,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "hostId" TEXT,
    "hostColor" TEXT NOT NULL DEFAULT 'black',
    "guestId" TEXT,
    "boardState" TEXT NOT NULL DEFAULT '[]',
    "moves" TEXT NOT NULL DEFAULT '[]',
    "currentPlayer" TEXT NOT NULL DEFAULT 'black',
    "winner" TEXT,
    "lastMoveAt" DATETIME,
    "disconnectTimeoutAt" DATETIME,
    "moveCount" INTEGER NOT NULL DEFAULT 0,
    "spectatorCount" INTEGER NOT NULL DEFAULT 0,
    "isRanked" BOOLEAN NOT NULL DEFAULT false,
    "matchId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Room_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Room_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoomMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "userId" TEXT,
    "username" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'players',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoomMessage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoomMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "boardSize" INTEGER NOT NULL DEFAULT 15,
    "playerBlackId" TEXT,
    "playerBlackName" TEXT NOT NULL,
    "playerBlackType" TEXT NOT NULL,
    "playerWhiteId" TEXT,
    "playerWhiteName" TEXT NOT NULL,
    "playerWhiteType" TEXT NOT NULL,
    "aiLevelBlack" INTEGER,
    "aiLevelWhite" INTEGER,
    "moves" TEXT NOT NULL,
    "result" TEXT,
    "duration" INTEGER,
    "blackCaptures" INTEGER NOT NULL DEFAULT 0,
    "whiteCaptures" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    CONSTRAINT "Match_playerBlackId_fkey" FOREIGN KEY ("playerBlackId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Match_playerWhiteId_fkey" FOREIGN KEY ("playerWhiteId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Match" ("aiLevelBlack", "aiLevelWhite", "blackCaptures", "boardSize", "createdAt", "duration", "endedAt", "id", "mode", "moves", "playerBlackId", "playerBlackName", "playerBlackType", "playerWhiteId", "playerWhiteName", "playerWhiteType", "result", "type", "whiteCaptures") SELECT "aiLevelBlack", "aiLevelWhite", "blackCaptures", "boardSize", "createdAt", "duration", "endedAt", "id", "mode", "moves", "playerBlackId", "playerBlackName", "playerBlackType", "playerWhiteId", "playerWhiteName", "playerWhiteType", "result", "type", "whiteCaptures" FROM "Match";
DROP TABLE "Match";
ALTER TABLE "new_Match" RENAME TO "Match";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Room_status_idx" ON "Room"("status");

-- CreateIndex
CREATE INDEX "Room_hostId_idx" ON "Room"("hostId");

-- CreateIndex
CREATE INDEX "Room_isPublic_status_idx" ON "Room"("isPublic", "status");

-- CreateIndex
CREATE INDEX "RoomMessage_roomId_channel_createdAt_idx" ON "RoomMessage"("roomId", "channel", "createdAt");

-- CreateIndex
CREATE INDEX "RoomMessage_roomId_createdAt_idx" ON "RoomMessage"("roomId", "createdAt");
