CREATE TABLE `tournament_draw_configurations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tournament_category_id` INTEGER NOT NULL,
    `draw_format` ENUM('SINGLE_ELIMINATION', 'ROUND_ROBIN', 'GROUP_KNOCKOUT') NOT NULL,
    `seeding_method` ENUM('RANDOM', 'MANUAL', 'RANKING') NOT NULL DEFAULT 'RANDOM',
    `group_count` INTEGER NULL,
    `qualifiers_per_group` INTEGER NULL,
    `third_place_match` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tournament_draw_configurations_tournament_category_id_key`(`tournament_category_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `tournament_draw_configurations`
    ADD CONSTRAINT `tournament_draw_configurations_tournament_category_id_fkey`
    FOREIGN KEY (`tournament_category_id`) REFERENCES `tournament_categories`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
