ALTER TABLE `categories`
    ADD COLUMN IF NOT EXISTS `pairing_type` VARCHAR(30) NULL;

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
    DROP COLUMN IF EXISTS `pairing_type`;
