-- Rename and extend the existing tournament table to match the tournament ERD.
ALTER TABLE `tournaments`
    CHANGE COLUMN `name` `title` VARCHAR(200) NOT NULL,
    CHANGE COLUMN `description` `description` VARCHAR(500) NULL,
    CHANGE COLUMN `startDate` `start_date` DATE NOT NULL,
    CHANGE COLUMN `endDate` `end_date` DATE NOT NULL,
    CHANGE COLUMN `createdAt` `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CHANGE COLUMN `updatedAt` `updated_at` DATETIME(3) NOT NULL,
    ADD COLUMN `created_by` INTEGER NOT NULL,
    ADD COLUMN `entry_fee` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `banner_url` VARCHAR(2048) NULL,
    ADD COLUMN `ranking_points_pool` INTEGER NOT NULL DEFAULT 0,
    ADD INDEX `tournaments_created_by_idx` (`created_by`);

-- CreateTable
CREATE TABLE `categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `categories_name_key` (`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `categoryId` INTEGER NOT NULL,
    `registered_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_categories_userId_categoryId_key` (`userId`, `categoryId`),
    INDEX `user_categories_categoryId_idx` (`categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tournament_venues` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tournamentId` INTEGER NOT NULL,
    `venue_name` VARCHAR(200) NOT NULL,
    `address` VARCHAR(500) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `tournament_venues_tournamentId_idx` (`tournamentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tournament_rules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tournamentId` INTEGER NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `tournament_rules_tournamentId_idx` (`tournamentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tournament_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tournamentId` INTEGER NOT NULL,
    `category_code` VARCHAR(30) NOT NULL,
    `category_name` VARCHAR(150) NOT NULL,
    `pairing_type` VARCHAR(30) NOT NULL,
    `seed_count` INTEGER NOT NULL DEFAULT 0,
    `match_format` VARCHAR(100) NOT NULL,
    `entry_status` VARCHAR(30) NOT NULL DEFAULT 'open',
    `eligibility_criteria` TEXT NULL,
    `points_pool` INTEGER NOT NULL DEFAULT 0,
    `shuttle_name` VARCHAR(150) NULL,
    `shuttle_speed` VARCHAR(30) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tournament_categories_tournamentId_category_code_key` (`tournamentId`, `category_code`),
    INDEX `tournament_categories_tournamentId_idx` (`tournamentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `category_point_tiers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tournamentCategoryId` INTEGER NOT NULL,
    `position` INTEGER NOT NULL,
    `label` VARCHAR(100) NOT NULL,
    `points` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `category_point_tiers_tournamentCategoryId_position_key` (`tournamentCategoryId`, `position`),
    INDEX `category_point_tiers_tournamentCategoryId_idx` (`tournamentCategoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tournaments` ADD CONSTRAINT `tournaments_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_categories` ADD CONSTRAINT `user_categories_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_categories` ADD CONSTRAINT `user_categories_categoryId_fkey`
    FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament_venues` ADD CONSTRAINT `tournament_venues_tournamentId_fkey`
    FOREIGN KEY (`tournamentId`) REFERENCES `tournaments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament_rules` ADD CONSTRAINT `tournament_rules_tournamentId_fkey`
    FOREIGN KEY (`tournamentId`) REFERENCES `tournaments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament_categories` ADD CONSTRAINT `tournament_categories_tournamentId_fkey`
    FOREIGN KEY (`tournamentId`) REFERENCES `tournaments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `category_point_tiers` ADD CONSTRAINT `category_point_tiers_tournamentCategoryId_fkey`
    FOREIGN KEY (`tournamentCategoryId`) REFERENCES `tournament_categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
