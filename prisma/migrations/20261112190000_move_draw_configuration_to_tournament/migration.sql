CREATE TEMPORARY TABLE `_draw_configuration_conflict_guard` (
    `tournament_id` INTEGER NOT NULL UNIQUE
);

INSERT INTO `_draw_configuration_conflict_guard` (`tournament_id`)
SELECT `tournament_id`
FROM (
    SELECT DISTINCT
        `categories`.`tournamentId` AS `tournament_id`,
        `configurations`.`draw_format`,
        `configurations`.`seeding_method`,
        `configurations`.`group_count`,
        `configurations`.`qualifiers_per_group`,
        `configurations`.`third_place_match`
    FROM `tournament_draw_configurations` AS `configurations`
    INNER JOIN `tournament_categories` AS `categories`
        ON `categories`.`id` = `configurations`.`tournament_category_id`
) AS `distinct_configurations`;

DROP TEMPORARY TABLE `_draw_configuration_conflict_guard`;

ALTER TABLE `tournament_draw_configurations`
    DROP FOREIGN KEY `tournament_draw_configurations_tournament_category_id_fkey`,
    DROP INDEX `tournament_draw_configurations_tournament_category_id_key`,
    ADD COLUMN `tournament_id` INTEGER NULL;

UPDATE `tournament_draw_configurations` AS `configurations`
INNER JOIN `tournament_categories` AS `categories`
    ON `categories`.`id` = `configurations`.`tournament_category_id`
SET `configurations`.`tournament_id` = `categories`.`tournamentId`;

DELETE `duplicate_configurations`
FROM `tournament_draw_configurations` AS `duplicate_configurations`
INNER JOIN `tournament_draw_configurations` AS `retained_configurations`
    ON `retained_configurations`.`tournament_id` = `duplicate_configurations`.`tournament_id`
    AND `retained_configurations`.`id` < `duplicate_configurations`.`id`;

ALTER TABLE `tournament_draw_configurations`
    DROP COLUMN `tournament_category_id`,
    MODIFY COLUMN `tournament_id` INTEGER NOT NULL,
    ADD UNIQUE INDEX `tournament_draw_configurations_tournament_id_key`(`tournament_id`),
    ADD CONSTRAINT `tournament_draw_configurations_tournament_id_fkey`
        FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`)
        ON DELETE CASCADE ON UPDATE CASCADE;
