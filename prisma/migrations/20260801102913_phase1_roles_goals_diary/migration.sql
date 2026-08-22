/*
  Warnings:

  - You are about to drop the column `date` on the `calorie_intakes` table. All the data in the column will be lost.
  - Added the required column `consumedAt` to the `calorie_intakes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `foodName` to the `calorie_intakes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mealType` to the `calorie_intakes` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'NUTRITIONIST', 'ADMIN');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PREMIUM');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');

-- AlterEnum
ALTER TYPE "VerificationPurpose" ADD VALUE 'PASSWORD_RESET';

-- DropIndex
DROP INDEX "calorie_intakes_userId_date_idx";

-- AlterTable
ALTER TABLE "calorie_intakes" DROP COLUMN "date",
ADD COLUMN     "consumedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "foodName" TEXT NOT NULL,
ADD COLUMN     "mealType" "MealType" NOT NULL,
ADD COLUMN     "portion" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER',
ADD COLUMN     "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'FREE';

-- CreateTable
CREATE TABLE "calorie_goals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetCalories" INTEGER NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calorie_goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "calorie_goals_userId_key" ON "calorie_goals"("userId");

-- CreateIndex
CREATE INDEX "calorie_intakes_userId_consumedAt_idx" ON "calorie_intakes"("userId", "consumedAt");

-- AddForeignKey
ALTER TABLE "calorie_goals" ADD CONSTRAINT "calorie_goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
