ALTER TABLE `tournament_registrations`
    ADD UNIQUE INDEX `tournament_registrations_id_tournamentCategoryId_key`
        (`id`, `tournamentCategoryId`);

ALTER TABLE `tournament_registration_members`
    ADD COLUMN `tournament_category_id` INTEGER NULL;

UPDATE `tournament_registration_members` AS member
JOIN `tournament_registrations` AS registration
    ON registration.`id` = member.`registration_id`
SET member.`tournament_category_id` = registration.`tournamentCategoryId`;

ALTER TABLE `tournament_registration_members`
    MODIFY COLUMN `tournament_category_id` INTEGER NOT NULL,
    ADD UNIQUE INDEX `tournament_registration_members_category_user_key`
        (`tournament_category_id`, `user_id`),
    DROP FOREIGN KEY `tournament_registration_members_registration_id_fkey`,
    ADD CONSTRAINT `tournament_registration_members_registration_category_fkey`
        FOREIGN KEY (`registration_id`, `tournament_category_id`)
        REFERENCES `tournament_registrations` (`id`, `tournamentCategoryId`)
        ON DELETE CASCADE ON UPDATE CASCADE;
