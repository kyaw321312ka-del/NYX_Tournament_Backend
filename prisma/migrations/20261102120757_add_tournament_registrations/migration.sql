-- AlterTable
ALTER TABLE `pending_registrations` ALTER COLUMN `otpExpiresAt` DROP DEFAULT;

-- CreateTable
CREATE TABLE `tournament_registration_statuses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tournament_registration_statuses_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tournament_registrations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tournamentCategoryId` INTEGER NOT NULL,
    `registeredBy` INTEGER NOT NULL,
    `statusId` INTEGER NOT NULL,
    `registered_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `tournament_registrations_tournamentCategoryId_statusId_idx`(`tournamentCategoryId`, `statusId`),
    INDEX `tournament_registrations_registeredBy_statusId_idx`(`registeredBy`, `statusId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tournament_registration_members` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `registration_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `tournament_registration_members_user_id_idx`(`user_id`),
    UNIQUE INDEX `tournament_registration_members_registration_id_user_id_key`(`registration_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tournament_registrations` ADD CONSTRAINT `tournament_registrations_tournamentCategoryId_fkey` FOREIGN KEY (`tournamentCategoryId`) REFERENCES `tournament_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament_registrations` ADD CONSTRAINT `tournament_registrations_registeredBy_fkey` FOREIGN KEY (`registeredBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament_registrations` ADD CONSTRAINT `tournament_registrations_statusId_fkey` FOREIGN KEY (`statusId`) REFERENCES `tournament_registration_statuses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament_registration_members` ADD CONSTRAINT `tournament_registration_members_registration_id_fkey` FOREIGN KEY (`registration_id`) REFERENCES `tournament_registrations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament_registration_members` ADD CONSTRAINT `tournament_registration_members_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
