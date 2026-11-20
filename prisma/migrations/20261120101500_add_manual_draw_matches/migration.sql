CREATE TABLE `tournament_draw_matches` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `draw_id` INTEGER NOT NULL,
    `round_number` INTEGER NOT NULL,
    `match_number` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'BYE', 'EMPTY', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    `winner_participant_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tdm_draw_round_match_uq` (`draw_id`, `round_number`, `match_number`),
    UNIQUE INDEX `tdm_id_draw_uq` (`id`, `draw_id`),
    INDEX `tdm_draw_status_idx` (`draw_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `tournament_draw_match_slots` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `draw_id` INTEGER NOT NULL,
    `match_id` INTEGER NOT NULL,
    `slot_number` INTEGER NOT NULL,
    `bracket_position` INTEGER NULL,
    `participant_id` INTEGER NULL,
    `source_match_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tdms_match_slot_uq` (`match_id`, `slot_number`),
    UNIQUE INDEX `tdms_draw_position_uq` (`draw_id`, `bracket_position`),
    UNIQUE INDEX `tdms_source_match_uq` (`source_match_id`),
    INDEX `tdms_source_match_idx` (`source_match_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `tournament_draw_matches`
    ADD CONSTRAINT `tournament_draw_matches_draw_id_fkey`
        FOREIGN KEY (`draw_id`) REFERENCES `tournament_draws` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `tournament_draw_matches_winner_participant_id_fkey`
        FOREIGN KEY (`winner_participant_id`) REFERENCES `tournament_draw_participants` (`id`)
        ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `tournament_draw_match_slots`
    ADD CONSTRAINT `tournament_draw_match_slots_draw_id_fkey`
        FOREIGN KEY (`draw_id`) REFERENCES `tournament_draws` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `tournament_draw_match_slots_match_id_draw_id_fkey`
        FOREIGN KEY (`match_id`, `draw_id`) REFERENCES `tournament_draw_matches` (`id`, `draw_id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `tournament_draw_match_slots_participant_id_fkey`
        FOREIGN KEY (`participant_id`) REFERENCES `tournament_draw_participants` (`id`)
        ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `tournament_draw_match_slots_source_match_id_fkey`
        FOREIGN KEY (`source_match_id`) REFERENCES `tournament_draw_matches` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE;
