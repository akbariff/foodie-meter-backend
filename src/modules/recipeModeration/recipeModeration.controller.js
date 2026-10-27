const prisma = require('../../config/db');
const AppError = require('../../middleware/AppError');
const { ok, created } = require('../../utils/respond');

const STATUS_FOR_ACTION = {
  APPROVED: 'ACTIVE',
  CLEARED: 'ACTIVE',
  FLAGGED: 'FLAGGED',
  REMOVED: 'REMOVED',
};

async function assertRecipeExists(recipeId) {
  const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
  if (!recipe) {
    throw new AppError(404, 'Recipe not found');
  }
  return recipe;
}

// Moderators need to see recipes across every user, unlike the owner-scoped
// lookup in recipes.controller.js, so this queries prisma.recipe directly.
async function queue(req, res) {
  const { status } = req.query;
  const recipes = await prisma.recipe.findMany({
    where: { ...(status ? { moderationStatus: status } : {}) },
    orderBy: { createdAt: 'desc' },
  });
  ok(res, recipes);
}

async function history(req, res) {
  const { recipeId } = req.params;
  await assertRecipeExists(recipeId);

  const entries = await prisma.recipeModeration.findMany({
    where: { recipeId },
    orderBy: { createdAt: 'desc' },
  });
  ok(res, entries);
}

async function moderate(req, res) {
  const { recipeId } = req.params;
  const { action, reason } = req.body;
  await assertRecipeExists(recipeId);

  const [entry] = await prisma.$transaction([
    prisma.recipeModeration.create({
      data: { recipeId, reviewedById: req.user.id, action, ...(reason !== undefined ? { reason } : {}) },
    }),
    prisma.recipe.update({
      where: { id: recipeId },
      data: { moderationStatus: STATUS_FOR_ACTION[action] },
    }),
  ]);

  created(res, entry);
}

module.exports = { queue, history, moderate };
