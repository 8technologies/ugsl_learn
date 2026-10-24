/*
  Warnings:

  - You are about to drop the column `mediaRef` on the `lessons` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `lessons` DROP COLUMN `mediaRef`;

-- AlterTable
ALTER TABLE `units` ADD COLUMN `mediaRef` VARCHAR(255) NULL;
