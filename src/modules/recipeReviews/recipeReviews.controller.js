const prisma = require('../../config/db');
const AppError = require('../../middleware/AppError');
const { ok } = require('../../utils/respond');

async function assertReviewableRecipe(recipeId, userId) {
  const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId,},
    });
    if (!recipe) {throw new AppError(404,'Recipe not found');}
  if (
    recipe.moderationStatus !== 'ACTIVE') 
    { throw new AppError( 404, 'Recipe not found');}

  // Private recipe:
  // only its owner may access it.
  if (!recipe.isShared && recipe.userId !== userId)
    {throw new AppError(404, 'Recipe not found');}

  return recipe;
}

async function listForRecipe(req, res) {
  const { recipeId } = req.params;

  const recipe = await assertReviewableRecipe(recipeId, req.user.id);

  const reviews = await prisma.recipeReview.findMany({
    where: {
      recipeId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  const mappedReviews = reviews.map(review => ({
    id: review.id,
    userId: review.userId,
    recipeId: review.recipeId,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,

    author: review.user.name,

    // Critical ownership flag
    mine: review.userId === req.user.id,
  }));

  const averageRating = reviews.length
    ? reviews.reduce(
        (sum, review) => sum + review.rating,
        0
      ) / reviews.length
    : null;

  ok(res, {
    recipe: {
      id: recipe.id,
      title: recipe.title,
    },
    reviews: mappedReviews,
    averageRating,
    count: reviews.length,
  });
}

async function upsertMine(req, res) {
  const { recipeId } = req.params;
  const { rating, comment } = req.body;
  await assertReviewableRecipe(recipeId, req.user.id);

  const review = await prisma.recipeReview.upsert({
    where: { userId_recipeId: { userId: req.user.id, recipeId } },
    update: { rating, comment },
    create: { userId: req.user.id, recipeId, rating, comment },
  });

  ok(res, review);
}

async function removeMine(req, res) {
  const { recipeId } = req.params;
  await assertReviewableRecipe(recipeId, req.user.id);

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
