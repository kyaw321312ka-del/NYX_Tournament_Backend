ALTER TABLE `pending_registrations`
    ADD COLUMN `profile_image_url` VARCHAR(2048) NULL,
    ADD COLUMN `frontIdImg` VARCHAR(2048) NULL,
    ADD COLUMN `backIdImg` VARCHAR(2048) NULL;
