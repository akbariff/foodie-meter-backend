const prisma = require('../../config/db');
const AppError = require('../../middleware/AppError');

async function list(req, res) {
  const recipes = await prisma.nutritionistRecipe.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(recipes);
}

async function getById(req, res) {
  const recipe = await prisma.nutritionistRecipe.findUnique({ where: { id: req.params.id } });
  if (!recipe) {
    throw new AppError(404, 'Nutritionist recipe not found');
  }
  res.json(recipe);
}

module.exports = { list, getById };
