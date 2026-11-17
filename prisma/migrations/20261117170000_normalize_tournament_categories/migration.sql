ALTER TABLE `categories`
    DROP INDEX `categories_name_key`,
    CHANGE COLUMN `name` `category_name` VARCHAR(100) NOT NULL,
    ADD COLUMN `category_code` VARCHAR(30) NULL,
    ADD COLUMN `pairing_type` VARCHAR(30) NULL;

UPDATE `categories`
SET `category_code` = CASE LOWER(`category_name`)
    WHEN 'men''s singles' THEN 'MS'
    WHEN 'men singles' THEN 'MS'
    WHEN 'women''s singles' THEN 'WS'
    WHEN 'women singles' THEN 'WS'
    WHEN 'men''s doubles' THEN 'MD'
    WHEN 'men doubles' THEN 'MD'
    WHEN 'women''s doubles' THEN 'WD'
    WHEN 'women doubles' THEN 'WD'
    WHEN 'mixed doubles' THEN 'XD'
    ELSE `category_code`
END
WHERE LOWER(`category_name`) IN (
    'men''s singles', 'men singles',
    'women''s singles', 'women singles',
    'men''s doubles', 'men doubles',
    'women''s doubles', 'women doubles',
    'mixed doubles'
);

UPDATE `categories` AS redundantCategory
INNER JOIN `categories` AS retainedCategory
    ON retainedCategory.`category_code` = redundantCategory.`category_code`
    AND retainedCategory.`id` < redundantCategory.`id`
SET redundantCategory.`category_code` = NULL;

ALTER TABLE `categories`
    ADD UNIQUE INDEX `categories_category_code_key` (`category_code`),
    ADD UNIQUE INDEX `categories_category_name_key` (`category_name`);

INSERT INTO `categories` (`category_code`, `category_name`)
SELECT source.`category_code`, MIN(source.`category_name`)
FROM `tournament_categories` AS source
LEFT JOIN `categories` AS master
    ON master.`category_code` = source.`category_code`
WHERE master.`id` IS NULL
GROUP BY source.`category_code`;

UPDATE `categories`
SET `pairing_type` = CASE `category_code`
    WHEN 'MS' THEN 'singles'
    WHEN 'WS' THEN 'singles'
    WHEN 'MD' THEN 'doubles'
    WHEN 'WD' THEN 'doubles'
    WHEN 'XD' THEN 'mixed_doubles'
    ELSE `pairing_type`
END
WHERE `category_code` IN ('MS', 'WS', 'MD', 'WD', 'XD');

ALTER TABLE `tournament_categories`
    ADD COLUMN `category_id` INTEGER NULL;

UPDATE `tournament_categories` AS tournamentCategory
INNER JOIN `categories` AS master
    ON master.`category_code` = tournamentCategory.`category_code`
SET tournamentCategory.`category_id` = master.`id`;

ALTER TABLE `tournament_categories`
    DROP INDEX `tournament_categories_tournamentId_category_code_key`,
    ADD UNIQUE INDEX `tournament_categories_tournamentId_category_id_key`
        (`tournamentId`, `category_id`),
    ADD INDEX `tournament_categories_category_id_idx` (`category_id`),
    ADD CONSTRAINT `tournament_categories_category_id_fkey`
        FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    MODIFY COLUMN `category_id` INTEGER NOT NULL,
    DROP COLUMN `category_code`,
    DROP COLUMN `category_name`,
    DROP COLUMN `pairing_type`;
