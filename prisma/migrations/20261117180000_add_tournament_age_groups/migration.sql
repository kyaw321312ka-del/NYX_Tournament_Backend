CREATE TABLE `age_groups` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tournament_id` INTEGER NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `min_age` INTEGER NOT NULL,
    `max_age` INTEGER NOT NULL,
    `age_cutoff_date` DATE NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `age_groups_tournament_id_name_key` (`tournament_id`, `name`),
    INDEX `age_groups_tournament_id_idx` (`tournament_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `age_groups`
    ADD CONSTRAINT `age_groups_tournament_id_fkey`
        FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `tournament_categories`
    ADD COLUMN `age_group_id` INTEGER NULL,
    DROP INDEX `tournament_categories_tournamentId_category_id_key`,
    ADD UNIQUE INDEX `tournament_categories_tournamentId_category_id_age_group_id_key`
        (`tournamentId`, `category_id`, `age_group_id`),
    ADD INDEX `tournament_categories_age_group_id_idx` (`age_group_id`),
    ADD CONSTRAINT `tournament_categories_age_group_id_fkey`
        FOREIGN KEY (`age_group_id`) REFERENCES `age_groups` (`id`)
        ON DELETE SET NULL ON UPDATE CASCADE;
