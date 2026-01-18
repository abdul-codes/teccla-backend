-- Migration: Fix drift and add Project-Conversation relation
-- Created: 2025-01-18

-- 1. Add missing columns to Project table (fix drift)
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "completionPercentage" DOUBLE PRECISION DEFAULT 50;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "downPaymentPercentage" DOUBLE PRECISION DEFAULT 50;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "isPublic" BOOLEAN DEFAULT true;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "maxParticipants" INTEGER;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "totalPrice" DOUBLE PRECISION;

-- 2. Add ProjectMember table (if not exists)
CREATE TABLE IF NOT EXISTS "ProjectMember" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "status" TEXT NOT NULL DEFAULT 'JOINED',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

-- 3. Add unique constraint for ProjectMember
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_userId_key" UNIQUE ("projectId", "userId");

-- 4. Add indexes for ProjectMember
CREATE INDEX IF NOT EXISTS "ProjectMember_userId_idx" ON "ProjectMember"("userId");
CREATE INDEX IF NOT EXISTS "ProjectMember_projectId_idx" ON "ProjectMember"("projectId");

-- 5. Add Project-Conversation relation columns
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "conversationId" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "projectId" TEXT;

-- 6. Add unique constraints
ALTER TABLE "Project" ADD CONSTRAINT "Project_conversationId_key" UNIQUE ("conversationId");
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_projectId_key" UNIQUE ("projectId");

-- 7. Add foreign key constraints
ALTER TABLE "Project" ADD CONSTRAINT "Project_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 8. Add indexes
CREATE INDEX IF NOT EXISTS "Project_conversationId_idx" ON "Project"("conversationId");
CREATE INDEX IF NOT EXISTS "Conversation_projectId_idx" ON "Conversation"("projectId");

-- 9. Update User model relation (add projectMembers)
-- This is handled by Prisma introspection, no direct SQL needed
