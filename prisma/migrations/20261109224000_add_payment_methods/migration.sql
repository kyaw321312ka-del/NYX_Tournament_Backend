CREATE TABLE `payment_methods` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `payment_method_name` VARCHAR(100) NOT NULL,
    `account_name` VARCHAR(150) NOT NULL,
    `account_number` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `payment_methods_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `payment_methods` (
    `payment_method_name`,
    `account_name`,
    `account_number`,
    `description`,
    `is_active`,
    `updated_at`
)
SELECT 'Legacy payment method', 'Unknown', 'Unknown', 'Legacy payment destination; update records manually if known.', false, CURRENT_TIMESTAMP(3)
WHERE EXISTS (SELECT 1 FROM `tournament_payments`);

ALTER TABLE `tournament_payments`
    ADD COLUMN `payment_method_id` INTEGER NULL,
    ADD COLUMN `payment_method_name_snapshot` VARCHAR(100) NULL,
    ADD COLUMN `account_name_snapshot` VARCHAR(150) NULL,
    ADD COLUMN `account_number_snapshot` VARCHAR(100) NULL;

UPDATE `tournament_payments`
SET
    `payment_method_id` = (
        SELECT `id` FROM `payment_methods` WHERE `payment_method_name` = 'Legacy payment method' ORDER BY `id` LIMIT 1
    ),
    `payment_method_name_snapshot` = 'Legacy payment method',
    `account_name_snapshot` = 'Unknown',
    `account_number_snapshot` = 'Unknown'
WHERE `payment_method_id` IS NULL;

ALTER TABLE `tournament_payments`
    MODIFY `payment_method_id` INTEGER NOT NULL,
    MODIFY `payment_method_name_snapshot` VARCHAR(100) NOT NULL,
    MODIFY `account_name_snapshot` VARCHAR(150) NOT NULL,
    MODIFY `account_number_snapshot` VARCHAR(100) NOT NULL,
    ADD INDEX `tournament_payments_payment_method_id_idx`(`payment_method_id`),
    ADD CONSTRAINT `tournament_payments_payment_method_id_fkey`
        FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE;
