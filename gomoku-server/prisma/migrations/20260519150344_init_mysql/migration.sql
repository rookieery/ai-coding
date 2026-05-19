-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `avatar` VARCHAR(191) NULL,
    `rating` INTEGER NOT NULL DEFAULT 1200,
    `role` VARCHAR(191) NOT NULL DEFAULT 'USER',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_phone_key`(`phone`),
    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Game` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `boardSize` INTEGER NOT NULL DEFAULT 15,
    `moves` TEXT NOT NULL,
    `result` VARCHAR(191) NULL,
    `playerBlack` VARCHAR(191) NULL,
    `playerWhite` VARCHAR(191) NULL,
    `isPublic` BOOLEAN NOT NULL DEFAULT true,
    `gameType` VARCHAR(191) NOT NULL DEFAULT 'gomoku',
    `tags` TEXT NOT NULL,
    `metadata` TEXT NULL,
    `authorId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Match` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `mode` VARCHAR(191) NOT NULL,
    `boardSize` INTEGER NOT NULL DEFAULT 15,
    `playerBlackId` VARCHAR(191) NULL,
    `playerBlackName` VARCHAR(191) NOT NULL,
    `playerBlackType` VARCHAR(191) NOT NULL,
    `playerWhiteId` VARCHAR(191) NULL,
    `playerWhiteName` VARCHAR(191) NOT NULL,
    `playerWhiteType` VARCHAR(191) NOT NULL,
    `aiLevelBlack` INTEGER NULL,
    `aiLevelWhite` INTEGER NULL,
    `moves` TEXT NOT NULL,
    `result` VARCHAR(191) NULL,
    `duration` INTEGER NULL,
    `blackCaptures` INTEGER NOT NULL DEFAULT 0,
    `whiteCaptures` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Room` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'waiting',
    `gameType` VARCHAR(191) NOT NULL DEFAULT 'gomoku',
    `boardSize` INTEGER NOT NULL DEFAULT 15,
    `ruleMode` VARCHAR(191) NOT NULL DEFAULT 'standard',
    `maxSpectators` INTEGER NOT NULL DEFAULT 50,
    `isPublic` BOOLEAN NOT NULL DEFAULT true,
    `hostId` VARCHAR(191) NULL,
    `hostColor` VARCHAR(191) NOT NULL DEFAULT 'black',
    `guestId` VARCHAR(191) NULL,
    `boardState` LONGTEXT NOT NULL,
    `moves` TEXT NOT NULL,
    `currentPlayer` VARCHAR(191) NOT NULL DEFAULT 'black',
    `winner` VARCHAR(191) NULL,
    `lastMoveAt` DATETIME(3) NULL,
    `disconnectTimeoutAt` DATETIME(3) NULL,
    `moveCount` INTEGER NOT NULL DEFAULT 0,
    `spectatorCount` INTEGER NOT NULL DEFAULT 0,
    `isRanked` BOOLEAN NOT NULL DEFAULT false,
    `matchId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Room_status_idx`(`status`),
    INDEX `Room_hostId_idx`(`hostId`),
    INDEX `Room_isPublic_status_idx`(`isPublic`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RoomMessage` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `username` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `channel` VARCHAR(191) NOT NULL DEFAULT 'players',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RoomMessage_roomId_channel_createdAt_idx`(`roomId`, `channel`, `createdAt`),
    INDEX `RoomMessage_roomId_createdAt_idx`(`roomId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Game` ADD CONSTRAINT `Game_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Match` ADD CONSTRAINT `Match_playerBlackId_fkey` FOREIGN KEY (`playerBlackId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Match` ADD CONSTRAINT `Match_playerWhiteId_fkey` FOREIGN KEY (`playerWhiteId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Room` ADD CONSTRAINT `Room_hostId_fkey` FOREIGN KEY (`hostId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Room` ADD CONSTRAINT `Room_guestId_fkey` FOREIGN KEY (`guestId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomMessage` ADD CONSTRAINT `RoomMessage_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomMessage` ADD CONSTRAINT `RoomMessage_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
