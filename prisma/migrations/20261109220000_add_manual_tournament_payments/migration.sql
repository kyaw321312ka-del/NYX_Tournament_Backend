CREATE TABLE `tournament_payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `registration_id` INTEGER NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'MMK',
    `proof_image_url` VARCHAR(500) NOT NULL,
    `transaction_reference` VARCHAR(150) NULL,
    `status` ENUM('pending', 'submitted', 'paid', 'rejected') NOT NULL DEFAULT 'submitted',
    `verified_by` INTEGER NULL,
    `verified_at` DATETIME(3) NULL,
    `rejection_reason` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `tournament_payments_registration_id_status_idx`(`registration_id`, `status`),
    INDEX `tournament_payments_status_created_at_idx`(`status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `tournament_payments`
    ADD CONSTRAINT `tournament_payments_registration_id_fkey`
    FOREIGN KEY (`registration_id`) REFERENCES `tournament_registrations`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `tournament_payments`
    ADD CONSTRAINT `tournament_payments_verified_by_fkey`
    FOREIGN KEY (`verified_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
