const prisma = require('../../config/db');
const AppError = require('../../middleware/AppError');
const { ok, created } = require('../../utils/respond');

async function assertOwnedRecipe(id, userId) {
  const recipe = await prisma.recipe.findUnique({ where: { id } });
  if (!recipe || recipe.userId !== userId) {
    throw new AppError(404, 'Recipe not found');
  }
  return recipe;
}

async function update(req, res) {await assertOwnedRecipe(req.params.id, req.user.id);
  const {title, ingredients, instructions, isShared,} = req.body;
  const recipe = await prisma.recipe.update({
    where: { id: req.params.id,},
    data: {
      ...(title !== undefined
        ? { title }
        : {}),

      ...(ingredients !== undefined
        ? { ingredients }
        : {}),

      ...(instructions !== undefined
        ? { instructions }
        : {}),

      ...(isShared !== undefined
        ? { isShared }
        : {}),
    },
  });

  ok(res, recipe);
}

async function list(req, res) {
  const recipes = await prisma.recipe.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
  });
  ok(res, recipes);
}

async function getById(req, res) {
  const recipe = await assertOwnedRecipe(req.params.id, req.user.id);
  ok(res, recipe);
}

async function update(req, res) {
  await assertOwnedRecipe(req.params.id, req.user.id);
  const { title, ingredients, instructions } = req.body;
  const recipe = await prisma.recipe.update({
    where: { id: req.params.id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(ingredients !== undefined ? { ingredients } : {}),
      ...(instructions !== undefined ? { instructions } : {}),
    },
  });
  ok(res, recipe);
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

  created(res, recipe);
}

async function listPublic(req, res) {
  const recipes = await prisma.recipe.findMany({
    where: {
      moderationStatus: 'ACTIVE',
      isShared: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      title: true,
      ingredients: true,
      instructions: true,
      moderationStatus: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  ok(
    res,
    recipes.map(recipe => ({
      id: recipe.id,
      title: recipe.title,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      moderationStatus: recipe.moderationStatus,
      createdAt: recipe.createdAt,
      ownerId: recipe.user.id,
      ownerName: recipe.user.name,
    }))
  );
}

module.exports = { create, list, listPublic, getById, update, remove, addFromNutritionistRecipe };
