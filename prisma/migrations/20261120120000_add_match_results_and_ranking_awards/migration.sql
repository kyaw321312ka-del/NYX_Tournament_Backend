ALTER TABLE `tournament_categories`
    ADD COLUMN `points_to_win` INTEGER NOT NULL DEFAULT 21,
    ADD COLUMN `winning_margin` INTEGER NOT NULL DEFAULT 2,
    ADD COLUMN `max_points` INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN `games_to_win` INTEGER NOT NULL DEFAULT 2;

ALTER TABLE `tournament_draws`
    ADD COLUMN `finalized_at` DATETIME(3) NULL;

ALTER TABLE `tournament_draw_matches`
    ADD COLUMN `result` JSON NULL;

CREATE TABLE `tournament_ranking_point_awards` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tournament_category_id` INTEGER NOT NULL,
    `draw_id` INTEGER NOT NULL,
    `registration_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `position` INTEGER NOT NULL,
    `label` VARCHAR(100) NOT NULL,
    `points` INTEGER NOT NULL,
    `awarded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `trpa_category_user_uq` (`tournament_category_id`, `user_id`),
    INDEX `trpa_user_awarded_idx` (`user_id`, `awarded_at`),
    INDEX `trpa_draw_idx` (`draw_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `tournament_ranking_point_awards`
    ADD CONSTRAINT `trpa_category_fkey`
        FOREIGN KEY (`tournament_category_id`) REFERENCES `tournament_categories` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `trpa_draw_category_fkey`
        FOREIGN KEY (`draw_id`, `tournament_category_id`)
        REFERENCES `tournament_draws` (`id`, `tournament_category_id`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `trpa_registration_category_fkey`
        FOREIGN KEY (`registration_id`, `tournament_category_id`)
        REFERENCES `tournament_registrations` (`id`, `tournament_category_id`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `trpa_user_fkey`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE;
