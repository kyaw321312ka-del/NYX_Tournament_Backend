ALTER TABLE `tournaments`
    ADD COLUMN `publication_status` ENUM('draft', 'published') NOT NULL DEFAULT 'draft';
