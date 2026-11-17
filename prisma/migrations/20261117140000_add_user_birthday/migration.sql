ALTER TABLE `users`
    ADD COLUMN `birthday` DATE NULL;

ALTER TABLE `pending_registrations`
    ADD COLUMN `birthday` DATE NULL;
