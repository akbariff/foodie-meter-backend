-- CreateTable
CREATE TABLE "website_info" (
    "id" TEXT NOT NULL,
    "siteName" TEXT NOT NULL DEFAULT 'FoodieMeter',
    "about" TEXT NOT NULL DEFAULT '',
    "contactEmail" TEXT NOT NULL DEFAULT '',
    "privacyPolicy" TEXT NOT NULL DEFAULT '',
    "termsOfUse" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "website_info_pkey" PRIMARY KEY ("id")
);
