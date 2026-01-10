-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "workspacePath" TEXT;

-- CreateIndex
CREATE INDEX "Project_workspacePath_idx" ON "Project"("workspacePath");
