const prisma = require('../../config/db');
const { ok } = require('../../utils/respond');

async function summary(req, res) {
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    usersByRole,
    usersByTier,
    usersByStatus,
    totalRecipes,
    totalNutritionistRecipes,
    totalDiaryEntries,
    reviewsByStatus,
    pendingApplications,
    recentSignups,
  ] = await Promise.all([
    prisma.user.groupBy({ by: ['role'], _count: true }),
    prisma.user.groupBy({ by: ['subscriptionTier'], _count: true }),
    prisma.user.groupBy({ by: ['status'], _count: true }),
    prisma.recipe.count(),
    prisma.nutritionistRecipe.count(),
    prisma.calorieIntake.count(),
    prisma.review.groupBy({ by: ['status'], _count: true }),
    prisma.nutritionistApplication.count({ where: { status: 'PENDING' } }),
    prisma.user.findMany({
      where: { createdAt: { gte: since30d } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const signupsByDay = {};
  for (const { createdAt } of recentSignups) {
    const day = createdAt.toISOString().slice(0, 10);
    signupsByDay[day] = (signupsByDay[day] || 0) + 1;
  }

  ok(res, {
    usersByRole: Object.fromEntries(usersByRole.map((r) => [r.role, r._count])),
    usersByTier: Object.fromEntries(usersByTier.map((r) => [r.subscriptionTier, r._count])),
    usersByStatus: Object.fromEntries(usersByStatus.map((r) => [r.status, r._count])),
    totalRecipes,
    totalNutritionistRecipes,
    totalDiaryEntries,
    reviewsByStatus: Object.fromEntries(reviewsByStatus.map((r) => [r.status, r._count])),
    pendingNutritionistApplications: pendingApplications,
    signupsLast30Days: signupsByDay,
    note:
      'Growth is derived from signup timestamps. Retention and subscription-conversion tracking require usage/event ' +
      'logging that does not exist yet in this backend, so they are intentionally omitted rather than fabricated.',
  });
}

module.exports = { summary };
