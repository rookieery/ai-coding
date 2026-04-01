-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "avatar" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 1200,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "boardSize" INTEGER NOT NULL DEFAULT 15,
    "moves" TEXT NOT NULL,
    "result" TEXT,
    "playerBlack" TEXT,
    "playerWhite" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT NOT NULL,
    "metadata" TEXT,
    "authorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Game_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Match" (
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
    "endedAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
