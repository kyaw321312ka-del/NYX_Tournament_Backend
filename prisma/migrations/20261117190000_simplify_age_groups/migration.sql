ALTER TABLE `age_groups`
    ADD COLUMN `age` INTEGER NULL;

UPDATE `age_groups`
SET `age` = `max_age`;

ALTER TABLE `tournament_categories`
    ADD COLUMN `age_cutoff_date` DATE NULL;

UPDATE `tournament_categories` AS tournamentCategory
INNER JOIN `age_groups` AS ageGroup
    ON ageGroup.`id` = tournamentCategory.`age_group_id`
SET tournamentCategory.`age_cutoff_date` = ageGroup.`age_cutoff_date`;

UPDATE `tournament_categories` AS tournamentCategory
INNER JOIN `age_groups` AS duplicateAgeGroup
    ON duplicateAgeGroup.`id` = tournamentCategory.`age_group_id`
INNER JOIN `age_groups` AS canonicalAgeGroup
    ON canonicalAgeGroup.`name` = duplicateAgeGroup.`name`
    AND canonicalAgeGroup.`age` = duplicateAgeGroup.`age`
    AND canonicalAgeGroup.`id` < duplicateAgeGroup.`id`
SET tournamentCategory.`age_group_id` = canonicalAgeGroup.`id`;

DELETE duplicateAgeGroup
FROM `age_groups` AS duplicateAgeGroup
INNER JOIN `age_groups` AS canonicalAgeGroup
    ON canonicalAgeGroup.`name` = duplicateAgeGroup.`name`
    AND canonicalAgeGroup.`age` = duplicateAgeGroup.`age`
    AND canonicalAgeGroup.`id` < duplicateAgeGroup.`id`;

ALTER TABLE `tournament_categories`
    DROP FOREIGN KEY `tournament_categories_age_group_id_fkey`;

ALTER TABLE `tournament_categories`
    ADD CONSTRAINT `tournament_categories_age_group_id_fkey`
        FOREIGN KEY (`age_group_id`) REFERENCES `age_groups` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `age_groups`
    DROP FOREIGN KEY `age_groups_tournament_id_fkey`,
    DROP INDEX `age_groups_tournament_id_name_key`,
    DROP INDEX `age_groups_tournament_id_idx`,
    MODIFY COLUMN `age` INTEGER NOT NULL,
    DROP COLUMN `tournament_id`,
    DROP COLUMN `min_age`,
    DROP COLUMN `max_age`,
    DROP COLUMN `age_cutoff_date`,
    DROP COLUMN `created_at`,
    DROP COLUMN `updated_at`,
    ADD UNIQUE INDEX `age_groups_name_age_key` (`name`, `age`);
