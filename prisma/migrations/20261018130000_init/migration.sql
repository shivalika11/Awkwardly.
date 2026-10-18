-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "GeneratedMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "scenario" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "directness" INTEGER NOT NULL DEFAULT 55,
    "score" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'local',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "savedAt" DATETIME,
    CONSTRAINT "GeneratedMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'funny',
    "length" TEXT NOT NULL DEFAULT 'medium',
    "directness" INTEGER NOT NULL DEFAULT 55,
    CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Guide" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "say" TEXT NOT NULL,
    "avoid" TEXT NOT NULL,
    "variants" TEXT NOT NULL,
    "advice" TEXT NOT NULL,
    "scenario" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "GuideBookmark" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GuideBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GuideBookmark_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Guide" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "GeneratedMessage_userId_createdAt_idx" ON "GeneratedMessage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "GeneratedMessage_userId_savedAt_idx" ON "GeneratedMessage"("userId", "savedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GuideBookmark_userId_guideId_key" ON "GuideBookmark"("userId", "guideId");

-- CreateIndex
CREATE INDEX "GuideBookmark_userId_idx" ON "GuideBookmark"("userId");
