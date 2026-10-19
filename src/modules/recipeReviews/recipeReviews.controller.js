const prisma = require('../../config/db');
const AppError = require('../../middleware/AppError');
const { ok, created } = require('../../utils/respond');

async function getRecipeOrThrow(recipeId) {
  const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
  if (!recipe) {
    throw new AppError(404, 'Recipe not found');
  }
  return recipe;
}

async function list(req, res) {
  await getRecipeOrThrow(req.params.recipeId);

  const reviews = await prisma.recipeReview.findMany({
    where: { recipeId: req.params.recipeId },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  ok(res, reviews);
}

async function create(req, res) {
  await getRecipeOrThrow(req.params.recipeId);

  const existing = await prisma.recipeReview.findUnique({
    where: {
      userId_recipeId: {
        userId: req.user.id,
        recipeId: req.params.recipeId,
      },
    },
  });

  if (existing) {
    throw new AppError(409, 'You have already reviewed this recipe');
  }

  const review = await prisma.recipeReview.create({
    data: {
      userId: req.user.id,
      recipeId: req.params.recipeId,
      rating: req.body.rating,
      comment: req.body.comment,
    },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  created(res, review);
}

async function assertOwnedReview(recipeId, reviewId, userId) {
  const review = await prisma.recipeReview.findUnique({ where: { id: reviewId } });
  if (!review || review.recipeId !== recipeId || review.userId !== userId) {
    throw new AppError(404, 'Review not found');
  }
  return review;
}

async function update(req, res) {
  await assertOwnedReview(req.params.recipeId, req.params.reviewId, req.user.id);

  const review = await prisma.recipeReview.update({
    where: { id: req.params.reviewId },
    data: {
      ...(req.body.rating !== undefined ? { rating: req.body.rating } : {}),
      ...(req.body.comment !== undefined ? { comment: req.body.comment } : {}),
    },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  ok(res, review);
}

async function remove(req, res) {
  await assertOwnedReview(req.params.recipeId, req.params.reviewId, req.user.id);
  await prisma.recipeReview.delete({ where: { id: req.params.reviewId } });
  res.status(204).send();
}

module.exports = { list, create, update, remove };
