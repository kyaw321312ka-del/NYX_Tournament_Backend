CREATE TABLE `tournament_partner_invitations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tournamentCategoryId` INTEGER NOT NULL,
    `invited_by` INTEGER NOT NULL,
    `invited_user_id` INTEGER NOT NULL,
    `status` ENUM('pending', 'accepted', 'declined', 'expired', 'cancelled') NOT NULL DEFAULT 'pending',
    `expires_at` DATETIME(3) NOT NULL,
    `responded_at` DATETIME(3) NULL,
    `registration_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tournament_partner_invitations_registration_id_key`(`registration_id`),
    INDEX `tournament_partner_invitations_invited_user_id_status_idx`(`invited_user_id`, `status`),
    INDEX `tournament_partner_invitations_invited_by_status_idx`(`invited_by`, `status`),
    INDEX `tournament_partner_invitations_tournamentCategoryId_status_idx`(`tournamentCategoryId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `tournament_partner_invitations`
    ADD CONSTRAINT `tournament_partner_invitations_tournamentCategoryId_fkey`
    FOREIGN KEY (`tournamentCategoryId`) REFERENCES `tournament_categories`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `tournament_partner_invitations`
    ADD CONSTRAINT `tournament_partner_invitations_invited_by_fkey`
    FOREIGN KEY (`invited_by`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `tournament_partner_invitations`
    ADD CONSTRAINT `tournament_partner_invitations_invited_user_id_fkey`
    FOREIGN KEY (`invited_user_id`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `tournament_partner_invitations`
    ADD CONSTRAINT `tournament_partner_invitations_registration_id_fkey`
    FOREIGN KEY (`registration_id`) REFERENCES `tournament_registrations`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
