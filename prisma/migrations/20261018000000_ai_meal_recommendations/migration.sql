CREATE TYPE "AiJobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');
CREATE TYPE "AiMealStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "users"
  ADD COLUMN "dietaryPreference" TEXT NOT NULL DEFAULT 'ANY',
  ADD COLUMN "excludedIngredients" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "ai_generation_jobs" (
  "id" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "modelName" TEXT NOT NULL,
  "count" INTEGER NOT NULL,
  "status" "AiJobStatus" NOT NULL DEFAULT 'PENDING',
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "ai_generation_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_meals" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "ingredients" TEXT NOT NULL,
  "instructions" TEXT NOT NULL,
  "mealType" "MealType" NOT NULL,
  "dietaryTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "ingredientTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "serving" TEXT,
  "calories" INTEGER,
  "protein" INTEGER,
  "carbs" INTEGER,
  "fat" INTEGER,
  "nutritionSource" TEXT,
  "status" "AiMealStatus" NOT NULL DEFAULT 'PENDING',
  "reviewNotes" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_meals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_meals_status_mealType_idx" ON "ai_meals"("status", "mealType");
ALTER TABLE "ai_generation_jobs" ADD CONSTRAINT "ai_generation_jobs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_meals" ADD CONSTRAINT "ai_meals_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ai_generation_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_meals" ADD CONSTRAINT "ai_meals_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
