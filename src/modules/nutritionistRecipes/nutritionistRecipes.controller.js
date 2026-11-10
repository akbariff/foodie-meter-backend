const prisma = require('../../config/db');
const AppError = require('../../middleware/AppError');
const { ok, created } = require('../../utils/respond');

async function assertExists(id) {
  const recipe = await prisma.nutritionistRecipe.findUnique({ where: { id } });
  if (!recipe) {
    throw new AppError(404, 'Nutritionist recipe not found');
  }
  return recipe;
}

async function list(req, res) {
  const recipes = await prisma.nutritionistRecipe.findMany({ orderBy: { createdAt: 'desc' } });
  ok(res, recipes);
}

async function getById(req, res) {
  ok(res, await assertExists(req.params.id));
}

async function create(req, res) {
  const { title, ingredients, instructions } = req.body;
  const recipe = await prisma.nutritionistRecipe.create({
    data: { title, ingredients, instructions },
  });
  created(res, recipe);
}

async function update(req, res) {
  await assertExists(req.params.id);
  const { title, ingredients, instructions } = req.body;
  const recipe = await prisma.nutritionistRecipe.update({
    where: { id: req.params.id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(ingredients !== undefined ? { ingredients } : {}),
      ...(instructions !== undefined ? { instructions } : {}),
    },
  });
  ok(res, recipe);
}

// Users' own copies keep their content; only the link back to this recipe is
// cleared (sourceNutritionistRecipeId is set null on delete).
async function remove(req, res) {
  await assertExists(req.params.id);
  await prisma.nutritionistRecipe.delete({ where: { id: req.params.id } });
  res.status(204).send();
}

module.exports = { list, getById, create, update, remove };
