const prisma = require('../../config/db');
const AppError = require('../../middleware/AppError');
const { ok } = require('../../utils/respond');

async function assertRecipeExists(recipeId) {
  const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
  if (!recipe) {
    throw new AppError(404, 'Recipe not found');
  }
  return recipe;
}

async function listForRecipe(req, res) {
  const { recipeId } = req.params;
  await assertRecipeExists(recipeId);

  const reviews = await prisma.recipeReview.findMany({
    where: { recipeId },
    orderBy: { createdAt: 'desc' },
  });

  const averageRating = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : null;

  ok(res, { reviews, averageRating, count: reviews.length });
}

async function upsertMine(req, res) {
  const { recipeId } = req.params;
  const { rating, comment } = req.body;
  await assertRecipeExists(recipeId);

  const review = await prisma.recipeReview.upsert({
    where: { userId_recipeId: { userId: req.user.id, recipeId } },
    update: { rating, comment },
    create: { userId: req.user.id, recipeId, rating, comment },
  });

  ok(res, review);
}

async function removeMine(req, res) {
  const { recipeId } = req.params;
  await assertRecipeExists(recipeId);

  const existing = await prisma.recipeReview.findUnique({
    where: { userId_recipeId: { userId: req.user.id, recipeId } },
  });
  if (!existing) {
    throw new AppError(404, 'You have not reviewed this recipe');
  }

  await prisma.recipeReview.delete({ where: { id: existing.id } });
  res.status(204).send();
}

module.exports = { listForRecipe, upsertMine, removeMine };
