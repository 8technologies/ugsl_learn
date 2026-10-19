-- AlterTable
ALTER TABLE `dictionary_entries` ADD COLUMN `difficulty` VARCHAR(20) NOT NULL DEFAULT 'beginner';

-- AlterTable
ALTER TABLE `learner_activity` ADD COLUMN `maintained` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `learner_progress` ADD COLUMN `score` INTEGER NULL;

-- AlterTable
ALTER TABLE `lessons` ADD COLUMN `xpReward` INTEGER NOT NULL DEFAULT 20;

-- AlterTable
ALTER TABLE `levels` ADD COLUMN `description` VARCHAR(500) NULL,
    ADD COLUMN `difficulty` VARCHAR(20) NOT NULL DEFAULT 'beginner';

-- AlterTable
ALTER TABLE `modules` ADD COLUMN `requiresModuleId` INTEGER NULL,
    ADD COLUMN `xpReward` INTEGER NOT NULL DEFAULT 50;

-- AlterTable
ALTER TABLE `quiz_questions` ADD COLUMN `correctAnswer` JSON NULL;

-- CreateTable
CREATE TABLE `learner_module_progress` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `learnerId` VARCHAR(191) NOT NULL,
    `moduleId` INTEGER NOT NULL,
    `status` ENUM('locked', 'available', 'in_progress', 'completed') NOT NULL DEFAULT 'locked',
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `learner_module_progress_learnerId_moduleId_key`(`learnerId`, `moduleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `question_attempts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `learnerId` VARCHAR(191) NOT NULL,
    `questionId` INTEGER NOT NULL,
    `givenAnswer` JSON NULL,
    `isCorrect` BOOLEAN NULL,
    `attemptedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `question_attempts_attemptedAt_idx`(`attemptedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sign_media` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `entryId` INTEGER NOT NULL,
    `videoUrl` VARCHAR(255) NOT NULL,
    `thumbnailUrl` VARCHAR(255) NULL,
    `angle` VARCHAR(20) NOT NULL DEFAULT 'front',
    `durationMs` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quiz_question_signs` (
    `questionId` INTEGER NOT NULL,
    `entryId` INTEGER NOT NULL,

    PRIMARY KEY (`questionId`, `entryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `learner_stats` (
    `learnerId` VARCHAR(191) NOT NULL,
    `totalXp` INTEGER NOT NULL DEFAULT 0,
    `currentStreak` INTEGER NOT NULL DEFAULT 0,
    `longestStreak` INTEGER NOT NULL DEFAULT 0,
    `hearts` INTEGER NOT NULL DEFAULT 5,
    `lastActiveDate` DATE NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`learnerId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `xp_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `learnerId` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `sourceType` VARCHAR(50) NOT NULL,
    `sourceId` VARCHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `xp_transactions_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_challenges` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `targetCount` INTEGER NOT NULL,
    `xpReward` INTEGER NOT NULL DEFAULT 30,

    UNIQUE INDEX `daily_challenges_date_key`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `learner_daily_challenges` (
    `learnerId` VARCHAR(191) NOT NULL,
    `challengeId` INTEGER NOT NULL,
    `currentCount` INTEGER NOT NULL DEFAULT 0,
    `completedAt` DATETIME(3) NULL,

    PRIMARY KEY (`learnerId`, `challengeId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `dictionary_entries_gloss_idx` ON `dictionary_entries`(`gloss`);

-- AddForeignKey
ALTER TABLE `modules` ADD CONSTRAINT `modules_requiresModuleId_fkey` FOREIGN KEY (`requiresModuleId`) REFERENCES `modules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `learner_module_progress` ADD CONSTRAINT `learner_module_progress_learnerId_fkey` FOREIGN KEY (`learnerId`) REFERENCES `learner_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `learner_module_progress` ADD CONSTRAINT `learner_module_progress_moduleId_fkey` FOREIGN KEY (`moduleId`) REFERENCES `modules`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `question_attempts` ADD CONSTRAINT `question_attempts_learnerId_fkey` FOREIGN KEY (`learnerId`) REFERENCES `learner_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `question_attempts` ADD CONSTRAINT `question_attempts_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `quiz_questions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sign_media` ADD CONSTRAINT `sign_media_entryId_fkey` FOREIGN KEY (`entryId`) REFERENCES `dictionary_entries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_question_signs` ADD CONSTRAINT `quiz_question_signs_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `quiz_questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_question_signs` ADD CONSTRAINT `quiz_question_signs_entryId_fkey` FOREIGN KEY (`entryId`) REFERENCES `dictionary_entries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `learner_stats` ADD CONSTRAINT `learner_stats_learnerId_fkey` FOREIGN KEY (`learnerId`) REFERENCES `learner_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `xp_transactions` ADD CONSTRAINT `xp_transactions_learnerId_fkey` FOREIGN KEY (`learnerId`) REFERENCES `learner_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `learner_daily_challenges` ADD CONSTRAINT `learner_daily_challenges_learnerId_fkey` FOREIGN KEY (`learnerId`) REFERENCES `learner_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `learner_daily_challenges` ADD CONSTRAINT `learner_daily_challenges_challengeId_fkey` FOREIGN KEY (`challengeId`) REFERENCES `daily_challenges`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
