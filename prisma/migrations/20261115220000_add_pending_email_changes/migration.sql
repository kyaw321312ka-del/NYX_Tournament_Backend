CREATE TABLE `pending_email_changes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `new_email` VARCHAR(254) NOT NULL,
    `otp_hash` VARCHAR(255) NOT NULL,
    `otp_expires_at` DATETIME(0) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `pec_user_uq`(`user_id`),
    UNIQUE INDEX `pec_email_uq`(`new_email`),
    INDEX `pec_expiry_idx`(`otp_expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `pending_email_changes`
    ADD CONSTRAINT `pec_user_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
