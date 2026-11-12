CREATE TABLE `tournament_draws` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tournament_category_id` INTEGER NOT NULL,
    `version` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `configuration_snapshot` JSON NOT NULL,
    `generated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `published_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `td_category_version_uq`(`tournament_category_id`, `version`),
    UNIQUE INDEX `td_id_category_uq`(`id`, `tournament_category_id`),
    INDEX `td_category_status_idx`(`tournament_category_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `tournament_draw_participants` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `draw_id` INTEGER NOT NULL,
    `registration_id` INTEGER NOT NULL,
    `tournament_category_id` INTEGER NOT NULL,
    `bracket_position` INTEGER NOT NULL,
    `seed_number` INTEGER NULL,
    `group_number` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `tdp_draw_registration_uq`(`draw_id`, `registration_id`),
    UNIQUE INDEX `tdp_draw_position_uq`(`draw_id`, `bracket_position`),
    INDEX `tdp_draw_category_idx`(`draw_id`, `tournament_category_id`),
    INDEX `tdp_registration_category_idx`(`registration_id`, `tournament_category_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `tournament_draws`
    ADD CONSTRAINT `tournament_draws_tournament_category_id_fkey`
    FOREIGN KEY (`tournament_category_id`) REFERENCES `tournament_categories`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `tournament_draw_participants`
    ADD CONSTRAINT `tournament_draw_participants_draw_category_fkey`
    FOREIGN KEY (`draw_id`, `tournament_category_id`) REFERENCES `tournament_draws`(`id`, `tournament_category_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `tournament_draw_participants_registration_category_fkey`
    FOREIGN KEY (`registration_id`, `tournament_category_id`) REFERENCES `tournament_registrations`(`id`, `tournamentCategoryId`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
