ALTER TABLE `tournament_categories`
    ADD COLUMN `entry_fee` DECIMAL(12, 2) NOT NULL DEFAULT 0;

UPDATE `tournament_categories` AS category
JOIN `tournaments` AS tournament ON tournament.`id` = category.`tournamentId`
SET category.`entry_fee` = tournament.`entry_fee`;

ALTER TABLE `tournaments`
    DROP COLUMN `entry_fee`;
