const prisma = require('../../config/db');
const AppError = require('../../middleware/AppError');
const { ok, created } = require('../../utils/respond');

async function assertEditable(id, user) {
  const recipe = await prisma.nutritionistRecipe.findUnique({ where: { id } });
  if (!recipe) {
    throw new AppError(404, 'Nutritionist recipe not found');
  }
  if (user.role === 'ADMIN') {
    return recipe;
  }
  // NUTRITIONIST may only edit recipes they authored themselves.
  if (recipe.createdByUserId !== user.id) {
    throw new AppError(403, 'You can only edit your own curated recipes', 'NOT_RECIPE_AUTHOR');
  }
  return recipe;
}

async function list(req, res) {
  const { category } = req.query;
  const recipes = await prisma.nutritionistRecipe.findMany({
    where: category ? { category } : undefined,
    orderBy: { createdAt: 'desc' },
  });
  ok(res, recipes);
}

async function getById(req, res) {
  const recipe = await prisma.nutritionistRecipe.findUnique({ where: { id: req.params.id } });
  if (!recipe) {
    throw new AppError(404, 'Nutritionist recipe not found');
  }
  ok(res, recipe);
}

async function create(req, res) {
  const { title, ingredients, instructions, category, tags } = req.body;

  // A Nutritionist may only publish into their own assigned category; Admin may set any category.
  let effectiveCategory = category;
  if (req.user.role === 'NUTRITIONIST') {
    if (!req.user.assignedCategory) {
      throw new AppError(403, 'Your account has no assigned category yet', 'NO_ASSIGNED_CATEGORY');
    }
    if (category && category !== req.user.assignedCategory) {
      throw new AppError(403, 'You can only publish recipes in your assigned category', 'CATEGORY_MISMATCH');
    }
    effectiveCategory = req.user.assignedCategory;
  }

  const recipe = await prisma.nutritionistRecipe.create({
    data: { title, ingredients, instructions, category: effectiveCategory, tags, createdByUserId: req.user.id },
  });
  created(res, recipe);
}

async function update(req, res) {
  await assertEditable(req.params.id, req.user);
  const { title, ingredients, instructions, category, tags } = req.body;

  if (req.user.role === 'NUTRITIONIST' && category && category !== req.user.assignedCategory) {
    throw new AppError(403, 'You can only publish recipes in your assigned category', 'CATEGORY_MISMATCH');
  }

  const recipe = await prisma.nutritionistRecipe.update({
    where: { id: req.params.id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(ingredients !== undefined ? { ingredients } : {}),
      ...(instructions !== undefined ? { instructions } : {}),
      ...(category !== undefined ? { category } : {}),
      ...(tags !== undefined ? { tags } : {}),
    },
  });
  ok(res, recipe);
}

async function remove(req, res) {
  await assertEditable(req.params.id, req.user);
  await prisma.nutritionistRecipe.delete({ where: { id: req.params.id } });
  res.status(204).send();
}

module.exports = { list, getById, create, update, remove };
