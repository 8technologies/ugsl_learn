-- AlterTable
ALTER TABLE `users` ADD COLUMN `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `emailVerifiedAt` DATETIME(3) NULL;

-- Accounts created before verification existed are treated as verified,
-- so existing users are not locked out.
UPDATE `users` SET `emailVerified` = true, `emailVerifiedAt` = NOW(3);
