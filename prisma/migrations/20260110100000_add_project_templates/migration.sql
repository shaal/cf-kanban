-- GAP-3.1.1: Add Project Templates feature
-- This migration adds the ProjectTemplate model and links it to Project

-- CreateTable
CREATE TABLE "ProjectTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'bot',
    "swarmConfig" JSONB NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectTemplate_slug_key" ON "ProjectTemplate"("slug");

-- CreateIndex
CREATE INDEX "ProjectTemplate_category_idx" ON "ProjectTemplate"("category");

-- CreateIndex
CREATE INDEX "ProjectTemplate_isActive_sortOrder_idx" ON "ProjectTemplate"("isActive", "sortOrder");

-- AlterTable: Add templateId to Project
ALTER TABLE "Project" ADD COLUMN "templateId" TEXT;

-- CreateIndex
CREATE INDEX "Project_templateId_idx" ON "Project"("templateId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProjectTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
