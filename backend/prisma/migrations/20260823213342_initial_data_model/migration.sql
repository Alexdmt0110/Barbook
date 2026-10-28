-- CreateEnum
CREATE TYPE "WorkspaceKind" AS ENUM ('PERSONAL', 'SHARED');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "CocktailType" AS ENUM ('CLASSIC', 'PERSONAL_CREATION', 'VARIATION');

-- CreateEnum
CREATE TYPE "RecipeMethod" AS ENUM ('SHAKER', 'MIXING_GLASS', 'BUILD', 'BLENDER');

-- CreateEnum
CREATE TYPE "MeasurementUnit" AS ENUM ('ML', 'G', 'PIECE', 'LEAF', 'SPRIG', 'DASH', 'DROP', 'BAR_SPOON', 'TEASPOON', 'TABLESPOON', 'SCOOP', 'PINCH', 'TOP_UP');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "WorkspaceKind" NOT NULL,
    "personalOwnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("workspaceId","userId")
);

-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cocktail" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CocktailType" NOT NULL,
    "family" TEXT,
    "method" "RecipeMethod" NOT NULL,
    "glass" TEXT NOT NULL,
    "ice" TEXT,
    "notes" TEXT,
    "imageUrl" TEXT,
    "workspaceId" TEXT NOT NULL,
    "folderId" TEXT,
    "mainAlcoholId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cocktail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "defaultAbv" DECIMAL(5,2),
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CocktailIngredient" (
    "id" TEXT NOT NULL,
    "cocktailId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "amount" DECIMAL(8,3),
    "unit" "MeasurementUnit" NOT NULL,
    "specification" TEXT,
    "abvOverride" DECIMAL(5,2),
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "CocktailIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GarnishIngredient" (
    "id" TEXT NOT NULL,
    "cocktailId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "amount" DECIMAL(8,3),
    "unit" "MeasurementUnit",
    "specification" TEXT,
    "usage" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "GarnishIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreparationStep" (
    "id" TEXT NOT NULL,
    "cocktailId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "PreparationStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CocktailTag" (
    "cocktailId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "CocktailTag_pkey" PRIMARY KEY ("cocktailId","tagId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_personalOwnerId_key" ON "Workspace"("personalOwnerId");

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Folder_workspaceId_name_key" ON "Folder"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "Cocktail_folderId_idx" ON "Cocktail"("folderId");

-- CreateIndex
CREATE INDEX "Cocktail_mainAlcoholId_idx" ON "Cocktail"("mainAlcoholId");

-- CreateIndex
CREATE INDEX "Cocktail_workspaceId_name_idx" ON "Cocktail"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "Cocktail_workspaceId_type_idx" ON "Cocktail"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "Cocktail_workspaceId_mainAlcoholId_idx" ON "Cocktail"("workspaceId", "mainAlcoholId");

-- CreateIndex
CREATE INDEX "Cocktail_workspaceId_method_idx" ON "Cocktail"("workspaceId", "method");

-- CreateIndex
CREATE UNIQUE INDEX "Cocktail_workspaceId_slug_key" ON "Cocktail"("workspaceId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_workspaceId_slug_key" ON "Ingredient"("workspaceId", "slug");

-- CreateIndex
CREATE INDEX "CocktailIngredient_ingredientId_idx" ON "CocktailIngredient"("ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "CocktailIngredient_cocktailId_sortOrder_key" ON "CocktailIngredient"("cocktailId", "sortOrder");

-- CreateIndex
CREATE INDEX "GarnishIngredient_ingredientId_idx" ON "GarnishIngredient"("ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "GarnishIngredient_cocktailId_sortOrder_key" ON "GarnishIngredient"("cocktailId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PreparationStep_cocktailId_sortOrder_key" ON "PreparationStep"("cocktailId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_workspaceId_slug_key" ON "Tag"("workspaceId", "slug");

-- CreateIndex
CREATE INDEX "CocktailTag_tagId_idx" ON "CocktailTag"("tagId");

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_personalOwnerId_fkey" FOREIGN KEY ("personalOwnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cocktail" ADD CONSTRAINT "Cocktail_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cocktail" ADD CONSTRAINT "Cocktail_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cocktail" ADD CONSTRAINT "Cocktail_mainAlcoholId_fkey" FOREIGN KEY ("mainAlcoholId") REFERENCES "Ingredient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CocktailIngredient" ADD CONSTRAINT "CocktailIngredient_cocktailId_fkey" FOREIGN KEY ("cocktailId") REFERENCES "Cocktail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CocktailIngredient" ADD CONSTRAINT "CocktailIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarnishIngredient" ADD CONSTRAINT "GarnishIngredient_cocktailId_fkey" FOREIGN KEY ("cocktailId") REFERENCES "Cocktail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarnishIngredient" ADD CONSTRAINT "GarnishIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreparationStep" ADD CONSTRAINT "PreparationStep_cocktailId_fkey" FOREIGN KEY ("cocktailId") REFERENCES "Cocktail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CocktailTag" ADD CONSTRAINT "CocktailTag_cocktailId_fkey" FOREIGN KEY ("cocktailId") REFERENCES "Cocktail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CocktailTag" ADD CONSTRAINT "CocktailTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enforce consistency between personal and shared workspaces.
ALTER TABLE "Workspace"
  ADD CONSTRAINT "Workspace_personal_owner_consistency_check"
    CHECK (
      (
        "kind" = 'PERSONAL'
          AND "personalOwnerId" IS NOT NULL
        )
        OR
      (
        "kind" = 'SHARED'
          AND "personalOwnerId" IS NULL
        )
      );

-- Alcohol by volume is always expressed as a percentage between 0 and 100.
ALTER TABLE "Ingredient"
  ADD CONSTRAINT "Ingredient_defaultAbv_range_check"
    CHECK (
      "defaultAbv" IS NULL
        OR ("defaultAbv" >= 0 AND "defaultAbv" <= 100)
      );

ALTER TABLE "CocktailIngredient"
  ADD CONSTRAINT "CocktailIngredient_abvOverride_range_check"
    CHECK (
      "abvOverride" IS NULL
        OR ("abvOverride" >= 0 AND "abvOverride" <= 100)
      );

-- TOP_UP has no exact amount; every other recipe ingredient requires a positive amount.
ALTER TABLE "CocktailIngredient"
  ADD CONSTRAINT "CocktailIngredient_amount_consistency_check"
    CHECK (
      (
        "unit" = 'TOP_UP'
          AND "amount" IS NULL
        )
        OR
      (
        "unit" <> 'TOP_UP'
          AND "amount" IS NOT NULL
          AND "amount" > 0
        )
      );

-- Garnish amount and unit are either both defined or both omitted.
ALTER TABLE "GarnishIngredient"
  ADD CONSTRAINT "GarnishIngredient_amount_unit_consistency_check"
    CHECK (
      (
        "amount" IS NULL
          AND "unit" IS NULL
        )
        OR
      (
        "amount" IS NOT NULL
          AND "amount" > 0
          AND "unit" IS NOT NULL
        )
      );

-- Ordered recipe elements cannot use negative positions.
ALTER TABLE "CocktailIngredient"
  ADD CONSTRAINT "CocktailIngredient_sortOrder_non_negative_check"
    CHECK ("sortOrder" >= 0);

ALTER TABLE "GarnishIngredient"
  ADD CONSTRAINT "GarnishIngredient_sortOrder_non_negative_check"
    CHECK ("sortOrder" >= 0);

ALTER TABLE "PreparationStep"
  ADD CONSTRAINT "PreparationStep_sortOrder_non_negative_check"
    CHECK ("sortOrder" >= 0);
