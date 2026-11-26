-- AlterTable
ALTER TABLE "User" ADD COLUMN "bio" TEXT,
ADD COLUMN "defaultModel" TEXT,
ADD COLUMN "themePreference" TEXT NOT NULL DEFAULT 'system';
