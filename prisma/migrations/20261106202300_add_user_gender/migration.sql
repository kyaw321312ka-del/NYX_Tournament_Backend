ALTER TABLE `users`
    ADD COLUMN `gender` VARCHAR(30) NULL;

ALTER TABLE `pending_registrations`
    ADD COLUMN `gender` VARCHAR(30) NULL;
