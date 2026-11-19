CREATE TABLE `user_profiles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `profile_image_url` VARCHAR(2048) NULL,
    `gender` VARCHAR(30) NULL,
    `address` VARCHAR(500) NULL,
    `birthday` DATE NULL,
    `club_name` VARCHAR(150) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_profiles_user_id_key` (`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `user_identity_documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `front_image_url` VARCHAR(2048) NULL,
    `back_image_url` VARCHAR(2048) NULL,
    `verification_status` VARCHAR(30) NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_identity_documents_user_id_key` (`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `user_profiles` (
    `user_id`,
    `profile_image_url`,
    `gender`,
    `birthday`,
    `club_name`,
    `created_at`,
    `updated_at`
)
SELECT
    `id`,
    `profile_image_url`,
    `gender`,
    `birthday`,
    `club_name`,
    `created_at`,
    `updated_at`
FROM `users`;

INSERT INTO `user_identity_documents` (
    `user_id`,
    `front_image_url`,
    `back_image_url`,
    `created_at`,
    `updated_at`
)
SELECT
    `id`,
    `frontIdImg`,
    `backIdImg`,
    `created_at`,
    `updated_at`
FROM `users`
WHERE `frontIdImg` IS NOT NULL OR `backIdImg` IS NOT NULL;

ALTER TABLE `user_profiles`
    ADD CONSTRAINT `user_profiles_user_id_fkey`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `user_identity_documents`
    ADD CONSTRAINT `user_identity_documents_user_id_fkey`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `users`
    DROP COLUMN `profile_image_url`,
    DROP COLUMN `gender`,
    DROP COLUMN `birthday`,
    DROP COLUMN `club_name`,
    DROP COLUMN `frontIdImg`,
    DROP COLUMN `backIdImg`;
