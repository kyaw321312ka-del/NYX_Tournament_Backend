UPDATE `users`
SET `gender` = 'male'
WHERE `gender` IS NULL;

UPDATE `pending_registrations`
SET `gender` = 'male'
WHERE `gender` IS NULL;

ALTER TABLE `users`
    MODIFY COLUMN `gender` VARCHAR(30) NOT NULL;

ALTER TABLE `pending_registrations`
    MODIFY COLUMN `gender` VARCHAR(30) NOT NULL;
