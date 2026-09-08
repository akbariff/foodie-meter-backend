/*
  Warnings:

  - Added the required column `updatedAt` to the `nutritionist_recipes` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NutritionistApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "nutritionist_recipes" ADD COLUMN     "category" TEXT,
ADD COLUMN     "createdByUserId" TEXT,
ADD COLUMN     "tags" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "recipes" ADD COLUMN     "flagReason" TEXT,
ADD COLUMN     "flagged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "flaggedAt" TIMESTAMP(3),
ADD COLUMN     "flaggedByUserId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "assignedCategory" TEXT;

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
    "moderatedByUserId" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutritionist_applications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "message" TEXT,
    "status" "NutritionistApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nutritionist_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_content" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedByUserId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_content_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reviews_status_idx" ON "reviews"("status");

-- CreateIndex
CREATE INDEX "nutritionist_applications_userId_status_idx" ON "nutritionist_applications"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "site_content_key_key" ON "site_content"("key");

-- CreateIndex
CREATE INDEX "nutritionist_recipes_category_idx" ON "nutritionist_recipes"("category");

-- CreateIndex
CREATE INDEX "recipes_flagged_idx" ON "recipes"("flagged");

-- AddForeignKey
ALTER TABLE "nutritionist_recipes" ADD CONSTRAINT "nutritionist_recipes_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_flaggedByUserId_fkey" FOREIGN KEY ("flaggedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_moderatedByUserId_fkey" FOREIGN KEY ("moderatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutritionist_applications" ADD CONSTRAINT "nutritionist_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutritionist_applications" ADD CONSTRAINT "nutritionist_applications_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_content" ADD CONSTRAINT "site_content_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
