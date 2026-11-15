CREATE TABLE `revoked_access_tokens` (
    `token_id` VARCHAR(36) NOT NULL,
    `expires_at` DATETIME(0) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `rat_expiry_idx`(`expires_at`),
    PRIMARY KEY (`token_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
