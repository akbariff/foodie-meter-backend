const prisma = require('../../config/db');
const AppError = require('../../middleware/AppError');
const { ok } = require('../../utils/respond');

async function list(req, res) {
  const recipes = await prisma.nutritionistRecipe.findMany({ orderBy: { createdAt: 'desc' } });
  ok(res, recipes);
}

async function getById(req, res) {
  const recipe = await prisma.nutritionistRecipe.findUnique({ where: { id: req.params.id } });
  if (!recipe) {
    throw new AppError(404, 'Nutritionist recipe not found');
  }
  ok(res, recipe);
}

module.exports = { list, getById };
