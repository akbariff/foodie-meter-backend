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

async function create(req, res) {
  const { title, ingredients, instructions } = req.body;
  const recipe = await prisma.recipe.create({
    data: { userId: req.user.id, title, ingredients, instructions },
  });
  created(res, recipe);
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

async function listFlagged(req, res) {
  const recipes = await prisma.recipe.findMany({
    where: { flagged: true },
    orderBy: { flaggedAt: 'desc' },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  ok(res, recipes);
}

async function flag(req, res) {
  const { flagReason } = req.body;
  const recipe = await prisma.recipe.findUnique({ where: { id: req.params.id } });
  if (!recipe) {
    throw new AppError(404, 'Recipe not found');
  }
  const updated = await prisma.recipe.update({
    where: { id: req.params.id },
    data: { flagged: true, flagReason, flaggedByUserId: req.user.id, flaggedAt: new Date() },
  });
  ok(res, updated);
}

async function unflag(req, res) {
  const recipe = await prisma.recipe.findUnique({ where: { id: req.params.id } });
  if (!recipe) {
    throw new AppError(404, 'Recipe not found');
  }
  const updated = await prisma.recipe.update({
    where: { id: req.params.id },
    data: { flagged: false, flagReason: null, flaggedByUserId: null, flaggedAt: null },
  });
  ok(res, updated);
}

module.exports = {
  create,
  list,
  getById,
  update,
  remove,
  addFromNutritionistRecipe,
  listFlagged,
  flag,
  unflag,
};
