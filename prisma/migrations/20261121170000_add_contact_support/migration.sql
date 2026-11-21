CREATE TABLE `contact_support` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `phone` VARCHAR(50) NOT NULL,
    `website` VARCHAR(2048) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `address` VARCHAR(500) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
