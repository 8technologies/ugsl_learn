-- AlterTable
ALTER TABLE `lessons` MODIFY `xpReward` INTEGER NOT NULL DEFAULT 50;

-- AlterTable
ALTER TABLE `modules` MODIFY `xpReward` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `units` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lessonId` INTEGER NOT NULL,
    `title` VARCHAR(150) NOT NULL,
    `description` VARCHAR(500) NULL,
    `sequence` INTEGER NOT NULL,
    `entryId` INTEGER NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'draft',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `units_lessonId_sequence_idx`(`lessonId`, `sequence`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `lessons_moduleId_sequence_idx` ON `lessons`(`moduleId`, `sequence`);

-- AddForeignKey
ALTER TABLE `units` ADD CONSTRAINT `units_lessonId_fkey` FOREIGN KEY (`lessonId`) REFERENCES `lessons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `units` ADD CONSTRAINT `units_entryId_fkey` FOREIGN KEY (`entryId`) REFERENCES `dictionary_entries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
