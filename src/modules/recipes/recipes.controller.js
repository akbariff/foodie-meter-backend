const prisma = require('../../config/db');
const AppError = require('../../middleware/AppError');

async function assertOwnedRecipe(id, userId) {
  const recipe = await prisma.recipe.findUnique({ where: { id } });
  if (!recipe || recipe.userId !== userId) {
    throw new AppError(404, 'Recipe not found');
  }
  return recipe;
}

async function create(req, res) {
  const { title, ingredients, instructions } = req.body;
  const recipe = await prisma.recipe.create({
    data: { userId: req.user.id, title, ingredients, instructions },
  });
  res.status(201).json(recipe);
}

async function list(req, res) {
  const recipes = await prisma.recipe.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(recipes);
}

async function getById(req, res) {
  const recipe = await assertOwnedRecipe(req.params.id, req.user.id);
  res.json(recipe);
}

async function remove(req, res) {
  await assertOwnedRecipe(req.params.id, req.user.id);
  await prisma.recipe.delete({ where: { id: req.params.id } });
  res.status(204).send();
}

async function addFromNutritionistRecipe(req, res) {
  const source = await prisma.nutritionistRecipe.findUnique({ where: { id: req.params.id } });
  if (!source) {
    throw new AppError(404, 'Nutritionist recipe not found');
  }

  const recipe = await prisma.recipe.create({
    data: {
      userId: req.user.id,
      title: source.title,
      ingredients: source.ingredients,
      instructions: source.instructions,
      sourceNutritionistRecipeId: source.id,
    },
  });

  res.status(201).json(recipe);
}

module.exports = { create, list, getById, remove, addFromNutritionistRecipe };
