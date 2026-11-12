CREATE TEMPORARY TABLE `_draw_configuration_snapshot` AS
SELECT
    `tournament_id`,
    `draw_format`,
    `seeding_method`,
    `group_count`,
    `qualifiers_per_group`,
    `third_place_match`,
    `created_at`,
    `updated_at`
FROM `tournament_draw_configurations`;

ALTER TABLE `tournament_draw_configurations`
    DROP FOREIGN KEY `tournament_draw_configurations_tournament_id_fkey`,
    DROP INDEX `tournament_draw_configurations_tournament_id_key`,
    ADD COLUMN `tournament_category_id` INTEGER NULL;

DELETE FROM `tournament_draw_configurations`;

INSERT INTO `tournament_draw_configurations` (
    `tournament_category_id`,
    `draw_format`,
    `seeding_method`,
    `group_count`,
    `qualifiers_per_group`,
    `third_place_match`,
    `created_at`,
    `updated_at`
)
SELECT
    `categories`.`id`,
    `snapshot`.`draw_format`,
    `snapshot`.`seeding_method`,
    `snapshot`.`group_count`,
    `snapshot`.`qualifiers_per_group`,
    `snapshot`.`third_place_match`,
    `snapshot`.`created_at`,
    `snapshot`.`updated_at`
FROM `_draw_configuration_snapshot` AS `snapshot`
INNER JOIN `tournament_categories` AS `categories`
    ON `categories`.`tournamentId` = `snapshot`.`tournament_id`;

DROP TEMPORARY TABLE `_draw_configuration_snapshot`;

ALTER TABLE `tournament_draw_configurations`
    DROP COLUMN `tournament_id`,
    MODIFY COLUMN `tournament_category_id` INTEGER NOT NULL,
    ADD UNIQUE INDEX `tournament_draw_configurations_tournament_category_id_key`(`tournament_category_id`),
    ADD CONSTRAINT `tournament_draw_configurations_tournament_category_id_fkey`
        FOREIGN KEY (`tournament_category_id`) REFERENCES `tournament_categories`(`id`)
        ON DELETE CASCADE ON UPDATE CASCADE;
