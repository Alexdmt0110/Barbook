/*
  Warnings:

  - A unique constraint covering the columns `[cocktailId,ingredientId]` on the table `CocktailIngredient` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CocktailIngredient_cocktailId_ingredientId_key" ON "CocktailIngredient"("cocktailId", "ingredientId");
